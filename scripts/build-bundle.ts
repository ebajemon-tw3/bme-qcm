// Construit public/data.json à partir du dépôt cours.
//
//   bun run bundle
//
// Lit les fiches CLAUDE.md, calendrier.md et les banques de questions. Le dépôt cours est lu,
// jamais modifié. Le fichier produit est publié tel quel : il est lisible par tous.
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GENERATOR_IDS, PROGRESS_STATES } from "../lib/types";
import type { Bundle, Deadline, ExamPrep, MockExam, PdfDoc, ProgressState, Question, SessionBlock, Sheet, Stay, Subject, SubjectProgress, UndatedDeadline } from "../lib/types";
import { findSection, firstTable, parseChapterList, parseDoc, stripMarkdown } from "./markdown";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COURS_DIR = process.env.COURS_DIR ?? path.join(os.homedir(), "Documents", "erasmus", "cours");
const OUT_JSON = path.join(ROOT, "public", "data.json");
const OUT_PDF = path.join(ROOT, "public", "fiches");
const SUBJECT_DIR = /^([A-Za-z0-9]+)_([a-z0-9-]+)$/;
const QUESTION_FILES = ["exams/questions.ts", "exams/questions.json"];
// Banques rédigées à la main (labs, annales), fusionnées avec la banque principale.
const EXTRA_QUESTION_FILES = ["exams/questions-labs.json", "exams/questions-annales.json"];

function fail(message: string): never {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

async function subjectIndex(): Promise<{ order: string[]; credits: Map<string, number> }> {
  const index = await readFile(path.join(COURS_DIR, "CLAUDE.md"), "utf8").catch(() => "");
  const table = firstTable(findSection(index, "Matières"));
  const col = table?.headers.findIndex((h) => h === "Code") ?? -1;
  const creditCol = table?.headers.findIndex((h) => h === "Crédits") ?? -1;
  if (!table || col === -1) return { order: [], credits: new Map() };
  const credits = new Map<string, number>();
  for (const r of table.rows) {
    const n = Number(stripMarkdown(r[creditCol] ?? ""));
    if (creditCol !== -1 && Number.isFinite(n) && n > 0) credits.set(stripMarkdown(r[col]), n);
  }
  return { order: table.rows.map((r) => stripMarkdown(r[col])), credits };
}

function validateQuestions(code: string, file: string, raw: unknown): Question[] {
  if (!Array.isArray(raw)) fail(`${file} : la banque doit exporter un tableau \`questions\`.`);
  const seen = new Set<string>();
  raw.forEach((q, i) => {
    const where = `${file}, question ${i + 1}`;
    if (typeof q?.id !== "string" || !q.id) fail(`${where} : id manquant.`);
    if (seen.has(q.id)) fail(`${where} : id ${q.id} en double.`);
    seen.add(q.id);
    if (!Number.isInteger(q.chapter)) fail(`${where} : chapter doit être un entier.`);
    for (const key of ["section", "sectionTitle", "topic", "topicTitle", "prompt", "explanation"]) {
      if (typeof q[key] !== "string") fail(`${where} : champ ${key} manquant.`);
    }
    if (!["check", "quiz", "other"].includes(q.origin)) fail(`${where} : origin inconnue (${q.origin}).`);
    if (!["single", "multiple"].includes(q.kind)) fail(`${where} : kind inconnu (${q.kind}).`);
    if (q.image !== undefined && !/^https:\/\//.test(q.image)) fail(`${where} : image doit être une URL https.`);
    if (!Array.isArray(q.choices) || q.choices.length < 2) fail(`${where} : au moins deux options attendues.`);
    const correct = q.choices.filter((c: { correct: unknown }) => c.correct === true).length;
    if (correct === 0) fail(`${where} : aucune bonne réponse.`);
    if (q.kind === "single" && correct !== 1) fail(`${where} : choix unique avec ${correct} bonnes réponses.`);
  });
  if (raw.length === 0) console.warn(`  ${code} : banque vide dans ${file}.`);
  return raw as Question[];
}

async function loadBank(code: string, dir: string, rel: string) {
  const file = path.join(dir, rel);
  if (rel.endsWith(".json")) {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return {
      questions: validateQuestions(code, rel, Array.isArray(parsed) ? parsed : parsed.questions),
      titles: (Array.isArray(parsed) ? {} : (parsed.chapterTitles ?? {})) as Record<number, string>,
    };
  }
  const mod = await import(pathToFileURL(file).href);
  return { questions: validateQuestions(code, rel, mod.questions), titles: {} as Record<number, string> };
}

async function loadQuestions(code: string, dir: string) {
  const main = QUESTION_FILES.find((rel) => existsSync(path.join(dir, rel)));
  const files = [main, ...EXTRA_QUESTION_FILES].filter((rel): rel is string => !!rel && existsSync(path.join(dir, rel)));
  if (files.length === 0) return { source: null, questions: [] as Question[], titles: {} as Record<number, string> };
  const banks = await Promise.all(files.map((rel) => loadBank(code, dir, rel)));
  const questions = banks.flatMap((b) => b.questions);
  const ids = new Set<string>();
  for (const q of questions) {
    if (ids.has(q.id)) fail(`${code} : id ${q.id} présent dans deux banques.`);
    ids.add(q.id);
  }
  return {
    source: files.join(", "),
    questions,
    titles: Object.assign({}, ...banks.map((b) => b.titles)) as Record<number, string>,
  };
}

// Titre de module tiré du topic de synthèse de chaque module, intitulé "<titre du module> Summary".
// Le titre du quiz de fin de module n'est pas fiable : l'un d'eux porte le titre d'un autre module.
function chapterTitles(questions: Question[]) {
  const titles: Record<number, string> = {};
  for (const q of questions) {
    const match = q.topicTitle.match(/^(.+) Summary$/);
    if (match && q.topic.split(".")[0] === String(q.chapter)) titles[q.chapter] ??= match[1];
  }
  return titles;
}

function sessionBlocks(planning: Subject["planning"]): SessionBlock[] {
  if (!planning) return [];
  const chapCol = planning.headers.findIndex((h) => /^chapitres?$/i.test(h));
  const dateCol = planning.headers.findIndex((h) => /^date/i.test(h));
  const labelCol = planning.headers.findIndex((h) => /^(séance|contenu)$/i.test(h));
  if (chapCol === -1) return [];
  return planning.rows
    .map((row) => ({
      date: dateCol === -1 ? "" : stripMarkdown(row[dateCol] ?? ""),
      label: labelCol === -1 ? "" : stripMarkdown(row[labelCol] ?? ""),
      chapters: parseChapterList(row[chapCol] ?? ""),
    }))
    .filter((block) => block.chapters.length > 0);
}

// Fiches de révision exams/fiche-*.md, titre tiré du premier titre de niveau 1.
async function loadSheets(dir: string): Promise<Sheet[]> {
  const exams = path.join(dir, "exams");
  if (!existsSync(exams)) return [];
  const files = (await readdir(exams)).filter((f) => /^fiche-.+\.md$/.test(f)).sort();
  return Promise.all(
    files.map(async (file) => {
      const md = await readFile(path.join(exams, file), "utf8");
      return {
        slug: file.replace(/^fiche-/, "").replace(/\.md$/, ""),
        file: `exams/${file}`,
        title: md.match(/^# (.+)$/m)?.[1] ?? file,
        blocks: parseDoc(md.replace(/^# .+$/m, "")),
      };
    }),
  );
}

// PDF de révision exams/pdf/*.pdf, copiés dans public/fiches/<code>/. Titre : \doctitle de la
// source LaTeX exams/latex/<nom>.tex quand elle existe, sinon le nom du fichier. Les PDF dont le nom
// contient « annales » recopient des sujets de vik.wiki, ceux qui commencent par « practice » les
// séries d'entraînement de l'enseignant : ils restent locaux, le site est public.
async function loadPdfs(code: string, dir: string): Promise<PdfDoc[]> {
  const src = path.join(dir, "exams", "pdf");
  if (!existsSync(src)) return [];
  const files = (await readdir(src)).filter((f) => f.endsWith(".pdf") && !f.includes("annales") && !f.startsWith("practice")).sort();
  const out = path.join(OUT_PDF, code);
  await mkdir(out, { recursive: true });
  return Promise.all(
    files.map(async (file) => {
      await copyFile(path.join(src, file), path.join(out, file));
      const tex = path.join(dir, "exams", "latex", file.replace(/\.pdf$/, ".tex"));
      const title = existsSync(tex)
        ? ((await readFile(tex, "utf8")).match(/\\newcommand\{\\doctitle\}\{(.+)\}/)?.[1] ?? file)
        : file;
      return { file, title, kb: Math.round((await stat(path.join(src, file))).size / 1024) };
    }),
  );
}

// Révision d'exam exams/exam-prep.json : questions ouvertes par séance et générateurs d'exercices.
// Le fichier est refusé s'il est incohérent ou s'il contient un tiret cadratin ou demi-cadratin.
async function loadExamPrep(dir: string): Promise<ExamPrep | undefined> {
  const rel = "exams/exam-prep.json";
  const file = path.join(dir, rel);
  if (!existsSync(file)) return undefined;
  const text = await readFile(file, "utf8");
  const dash = text.search(/[\u2013\u2014]/);
  if (dash !== -1) fail(`${rel}, ligne ${text.slice(0, dash).split("\n").length} : tiret cadratin ou demi-cadratin.`);
  const prep = JSON.parse(text) as ExamPrep;
  for (const key of ["title", "date", "summary"] as const) {
    if (typeof prep[key] !== "string" || !prep[key]) fail(`${rel} : champ ${key} manquant.`);
  }
  if (prep.unitLabel !== undefined && (typeof prep.unitLabel !== "string" || !prep.unitLabel)) fail(`${rel} : unitLabel doit être un texte non vide.`);
  for (const key of ["questionCount", "pointsPerQuestion", "passMark"] as const) {
    if (!Number.isInteger(prep[key]) || prep[key] <= 0) fail(`${rel} : ${key} doit être un entier positif.`);
  }
  if (!Array.isArray(prep.sessions) || prep.sessions.length !== prep.questionCount) {
    fail(`${rel} : une séance par question attendue (${prep.questionCount}).`);
  }
  const ids = new Set<string>();
  for (const s of prep.sessions) {
    const where = `${rel}, séance ${s.session}`;
    if (!Number.isInteger(s.session) || typeof s.title !== "string") fail(`${where} : session ou title manquant.`);
    if (!Array.isArray(s.generators) || s.generators.some((g) => !(GENERATOR_IDS as readonly string[]).includes(g))) {
      fail(`${where} : générateur inconnu (connus : ${GENERATOR_IDS.join(", ")}).`);
    }
    if (!Array.isArray(s.questions)) fail(`${where} : questions doit être un tableau.`);
    if (s.generators.length === 0 && s.questions.length === 0) fail(`${where} : ni générateur ni question.`);
    for (const q of s.questions) {
      const at = `${where}, question ${q.id ?? "?"}`;
      if (typeof q.id !== "string" || !q.id) fail(`${where} : id de question manquant.`);
      if (ids.has(q.id)) fail(`${at} : id en double.`);
      ids.add(q.id);
      for (const key of ["title", "prompt"] as const) {
        if (typeof q[key] !== "string" || !q[key]) fail(`${at} : champ ${key} manquant.`);
      }
      for (const key of ["answer", "refs"] as const) {
        if (!Array.isArray(q[key]) || q[key].length === 0) fail(`${at} : ${key} doit être un tableau non vide.`);
      }
      if (!Array.isArray(q.points)) fail(`${at} : points doit être un tableau, vide si pas de barème.`);
      const total = q.points.reduce((sum, p) => sum + p.points, 0);
      if (q.points.length && Math.abs(total - prep.pointsPerQuestion) > 1e-9) fail(`${at} : barème de ${total} points au lieu de ${prep.pointsPerQuestion}.`);
      if (q.table && (!Array.isArray(q.table.headers) || q.table.rows.some((r) => r.length !== q.table!.headers.length))) {
        fail(`${at} : tableau mal formé.`);
      }
    }
  }
  return prep;
}

// Sujets blancs exams/examen-blanc.json : chaque id doit exister dans la banque de la matière.
async function loadMocks(dir: string, questions: Question[]): Promise<MockExam[] | undefined> {
  const rel = "exams/examen-blanc.json";
  const file = path.join(dir, rel);
  if (!existsSync(file)) return undefined;
  const text = await readFile(file, "utf8");
  const dash = text.search(/[\u2013\u2014]/);
  if (dash !== -1) fail(`${rel}, ligne ${text.slice(0, dash).split("\n").length} : tiret cadratin ou demi-cadratin.`);
  const { mocks } = JSON.parse(text) as { mocks: MockExam[] };
  const known = new Set(questions.map((q) => q.id));
  for (const m of mocks) {
    for (const key of ["id", "date", "title", "summary"] as const) {
      if (typeof m[key] !== "string" || !m[key]) fail(`${rel} : champ ${key} manquant.`);
    }
    if (!Number.isInteger(m.count) || m.count <= 0) fail(`${rel}, ${m.id} : count doit être un entier positif.`);
    if (m.penalty !== undefined && typeof m.penalty !== "boolean") fail(`${rel}, ${m.id} : penalty doit être un booléen.`);
    if (m.bonus !== undefined && (!Number.isInteger(m.bonus) || m.bonus < 0 || m.bonus >= m.count)) {
      fail(`${rel}, ${m.id} : bonus doit être un entier entre 0 et count - 1.`);
    }
    const missing = m.ids.filter((id) => !known.has(id));
    if (missing.length) fail(`${rel}, ${m.id} : questions absentes de la banque : ${missing.join(", ")}.`);
  }
  return mocks;
}

async function loadSubject(entry: string): Promise<{ subject: Subject; questions: Question[] }> {
  const [, code, slug] = entry.match(SUBJECT_DIR)!;
  const dir = path.join(COURS_DIR, entry);
  const md = await readFile(path.join(dir, "CLAUDE.md"), "utf8");

  const identityTable = firstTable(findSection(md, "Identité de la matière"));
  const identity = (identityTable?.rows ?? []).map((r) => [r[0] ?? "", r[1] ?? ""] as [string, string]);
  const heading = md.match(/^# (.+)$/m)?.[1] ?? code;
  const title =
    identity.find(([k]) => k === "Intitulé")?.[1] ?? heading.replace(new RegExp(`^${code},\\s*`), "");
  const planning = firstTable(findSection(md, "Planning des séances"));
  const { source, questions, titles } = await loadQuestions(code, dir);

  return {
    subject: {
      code,
      slug,
      dir: entry,
      title: stripMarkdown(title),
      sigle: null,
      identity,
      schedule: firstTable(findSection(md, "Créneau et salle")),
      teachers: firstTable(findSection(md, "Enseignants")),
      planning,
      blocks: sessionBlocks(planning),
      chapterTitles: { ...chapterTitles(questions), ...titles },
      questionSource: source,
      sheets: await loadSheets(dir),
      pdfs: await loadPdfs(code, dir),
      examPrep: await loadExamPrep(dir),
      mocks: await loadMocks(dir, questions),
    },
    questions,
  };
}

function subjectCodes(label: string, sigles: Map<string, string>, all: string[]) {
  const clean = stripMarkdown(label);
  if (/^\(toutes\)$/i.test(clean)) return all;
  return clean
    .split(/,\s*/)
    .map((s) => sigles.get(s))
    .filter((c): c is string => Boolean(c));
}

// Première ligne d'un tableau à deux colonnes de dates : début, fin.
function period(md: string, section: string): Stay | null {
  const row = firstTable(findSection(md, section))?.rows[0] ?? [];
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  return iso.test(row[0] ?? "") && iso.test(row[1] ?? "") ? { start: row[0], end: row[1] } : null;
}

async function loadCalendar(subjects: Subject[]) {
  const md = await readFile(path.join(COURS_DIR, "calendrier.md"), "utf8");
  const sigles = new Map<string, string>();
  for (const row of firstTable(findSection(md, "Légende des matières"))?.rows ?? []) {
    const code = stripMarkdown(row[1] ?? "").split(",")[0].trim();
    sigles.set(stripMarkdown(row[0] ?? ""), code);
  }
  for (const subject of subjects) {
    subject.sigle = [...sigles].find(([, code]) => code === subject.code)?.[0] ?? null;
  }
  const all = subjects.map((s) => s.code);

  const dated: Deadline[] = (firstTable(findSection(md, "Échéances, ordre chronologique"))?.rows ?? [])
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row[0] ?? ""))
    .map((row) => ({
      date: row[0],
      weekday: row[1] ?? "",
      subjectLabel: stripMarkdown(row[2] ?? ""),
      codes: subjectCodes(row[2] ?? "", sigles, all),
      event: row[3] ?? "",
      type: stripMarkdown(row[4] ?? ""),
    }));

  const progress: SubjectProgress[] = [];
  for (const row of firstTable(findSection(md, "Avancement des matières"))?.rows ?? []) {
    const sigle = stripMarkdown(row[0] ?? "");
    const code = sigles.get(sigle);
    const state = stripMarkdown(row[1] ?? "") as ProgressState;
    if (!code) fail(`avancement : sigle inconnu « ${sigle} ».`);
    if (!PROGRESS_STATES.includes(state)) fail(`avancement : état inconnu « ${state} » pour ${sigle}.`);
    progress.push({ code, state, done: stripMarkdown(row[2] ?? ""), left: stripMarkdown(row[3] ?? "") });
  }

  const undated: UndatedDeadline[] = (firstTable(findSection(md, "Échéances non datées"))?.rows ?? []).map(
    (row) => ({
      subjectLabel: stripMarkdown(row[0] ?? ""),
      codes: subjectCodes(row[0] ?? "", sigles, all),
      event: row[1] ?? "",
      status: row[2] ?? "",
    }),
  );
  return { dated, undated, progress, stay: period(md, "Séjour"), semester: period(md, "Semestre") };
}

async function main() {
  if (!existsSync(path.join(COURS_DIR, "calendrier.md"))) fail(`dépôt cours introuvable dans ${COURS_DIR} (régler COURS_DIR).`);

  const entries = (await readdir(COURS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && SUBJECT_DIR.test(e.name) && existsSync(path.join(COURS_DIR, e.name, "CLAUDE.md")))
    .map((e) => e.name);
  const { order, credits } = await subjectIndex();
  const rank = (entry: string) => {
    const i = order.indexOf(entry.split("_")[0]);
    return i === -1 ? order.length : i;
  };
  entries.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  await rm(OUT_PDF, { recursive: true, force: true });
  const subjects: Subject[] = [];
  const questions: Record<string, Question[]> = {};
  for (const entry of entries) {
    const loaded = await loadSubject(entry);
    loaded.subject.credits = credits.get(loaded.subject.code) ?? null;
    subjects.push(loaded.subject);
    if (loaded.questions.length > 0) questions[loaded.subject.code] = loaded.questions;
  }
  const { dated, undated, progress, stay, semester } = await loadCalendar(subjects);

  const bundle: Bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    subjects,
    deadlines: dated,
    undated,
    stay,
    semester,
    progress,
    questions,
  };

  const json = JSON.stringify(bundle);
  await writeFile(OUT_JSON, json);

  console.log(`Dépôt lu : ${COURS_DIR}`);
  for (const s of subjects) {
    const n = questions[s.code]?.length ?? 0;
    const prep = s.examPrep ? `  révision d'exam : ${s.examPrep.sessions.reduce((sum, x) => sum + x.questions.length, 0)} questions ouvertes` : "";
    console.log(`  ${s.code.padEnd(15)} ${String(n).padStart(4)} questions  ${s.blocks.length} blocs de séance  ${s.sheets?.length ?? 0} fiches  ${s.pdfs?.length ?? 0} PDF${prep}`);
  }
  console.log(`Échéances : ${dated.length} datées, ${undated.length} non datées`);
  console.log(`Avancement : ${progress.length} matières`);
  console.log(`Séjour : ${stay ? `${stay.start} au ${stay.end}` : "section absente de calendrier.md"}`);
  console.log(`Semestre : ${semester ? `${semester.start} au ${semester.end}` : "section absente de calendrier.md"}`);
  console.log(`Données : ${path.relative(ROOT, OUT_JSON)} (${(json.length / 1024).toFixed(0)} Ko)`);
}

await main();
