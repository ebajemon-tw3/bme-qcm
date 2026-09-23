// Construit public/data.enc à partir du dépôt cours.
//
//   SITE_PASSWORD=... bun run bundle
//
// Lit les fiches CLAUDE.md, calendrier.md et les banques de questions, écrit le JSON en clair
// dans data/bundle.json (gitignoré) puis sa version compressée et chiffrée dans public/data.enc.
// Le dépôt cours est lu, jamais modifié.
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { encryptBundle, PBKDF2_ITERATIONS } from "../lib/crypto";
import type { Bundle, Deadline, Question, SessionBlock, Subject, UndatedDeadline } from "../lib/types";
import { findSection, firstTable, parseChapterList, stripMarkdown } from "./markdown";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COURS_DIR = process.env.COURS_DIR ?? path.join(os.homedir(), "Documents", "erasmus", "cours");
const OUT_ENC = path.join(ROOT, "public", "data.enc");
const OUT_JSON = path.join(ROOT, "data", "bundle.json");
const SUBJECT_DIR = /^([A-Z0-9]+)_([a-z0-9-]+)$/;
const QUESTION_FILES = ["exams/questions.ts", "exams/questions.json"];

function fail(message: string): never {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

async function subjectOrder(): Promise<string[]> {
  const index = await readFile(path.join(COURS_DIR, "CLAUDE.md"), "utf8").catch(() => "");
  const table = firstTable(findSection(index, "Matières"));
  const col = table?.headers.findIndex((h) => h === "Code") ?? -1;
  return table && col !== -1 ? table.rows.map((r) => stripMarkdown(r[col])) : [];
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
    if (!Array.isArray(q.choices) || q.choices.length < 2) fail(`${where} : au moins deux options attendues.`);
    const correct = q.choices.filter((c: { correct: unknown }) => c.correct === true).length;
    if (correct === 0) fail(`${where} : aucune bonne réponse.`);
    if (q.kind === "single" && correct !== 1) fail(`${where} : choix unique avec ${correct} bonnes réponses.`);
  });
  if (raw.length === 0) console.warn(`  ${code} : banque vide dans ${file}.`);
  return raw as Question[];
}

async function loadQuestions(code: string, dir: string) {
  for (const rel of QUESTION_FILES) {
    const file = path.join(dir, rel);
    if (!existsSync(file)) continue;
    if (rel.endsWith(".json")) {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      return { source: rel, questions: validateQuestions(code, rel, Array.isArray(parsed) ? parsed : parsed.questions) };
    }
    const mod = await import(pathToFileURL(file).href);
    return { source: rel, questions: validateQuestions(code, rel, mod.questions) };
  }
  return { source: null, questions: [] as Question[] };
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
  const { source, questions } = await loadQuestions(code, dir);

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
      chapterTitles: chapterTitles(questions),
      questionSource: source,
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

  const undated: UndatedDeadline[] = (firstTable(findSection(md, "Échéances non datées"))?.rows ?? []).map(
    (row) => ({
      subjectLabel: stripMarkdown(row[0] ?? ""),
      codes: subjectCodes(row[0] ?? "", sigles, all),
      event: row[1] ?? "",
      status: row[2] ?? "",
    }),
  );
  return { dated, undated };
}

async function main() {
  const password = process.env.SITE_PASSWORD;
  if (!password) fail("variable SITE_PASSWORD absente. Lancer : SITE_PASSWORD=... bun run bundle");
  if (!existsSync(path.join(COURS_DIR, "calendrier.md"))) fail(`dépôt cours introuvable dans ${COURS_DIR} (régler COURS_DIR).`);

  const entries = (await readdir(COURS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && SUBJECT_DIR.test(e.name) && existsSync(path.join(COURS_DIR, e.name, "CLAUDE.md")))
    .map((e) => e.name);
  const order = await subjectOrder();
  const rank = (entry: string) => {
    const i = order.indexOf(entry.split("_")[0]);
    return i === -1 ? order.length : i;
  };
  entries.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  const subjects: Subject[] = [];
  const questions: Record<string, Question[]> = {};
  for (const entry of entries) {
    const loaded = await loadSubject(entry);
    subjects.push(loaded.subject);
    if (loaded.questions.length > 0) questions[loaded.subject.code] = loaded.questions;
  }
  const { dated, undated } = await loadCalendar(subjects);

  const bundle: Bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    subjects,
    deadlines: dated,
    undated,
    questions,
  };

  const json = JSON.stringify(bundle);
  const encrypted = await encryptBundle(new Uint8Array(gzipSync(json)), password);
  await mkdir(path.dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(bundle, null, 2));
  await writeFile(OUT_ENC, encrypted);

  console.log(`Dépôt lu : ${COURS_DIR}`);
  for (const s of subjects) {
    const n = questions[s.code]?.length ?? 0;
    console.log(`  ${s.code.padEnd(15)} ${String(n).padStart(4)} questions  ${s.blocks.length} blocs de séance`);
  }
  console.log(`Échéances : ${dated.length} datées, ${undated.length} non datées`);
  console.log(`JSON en clair : ${path.relative(ROOT, OUT_JSON)} (${(json.length / 1024).toFixed(0)} Ko, gitignoré)`);
  console.log(`Bundle chiffré : ${path.relative(ROOT, OUT_ENC)} (${(encrypted.length / 1024).toFixed(0)} Ko, PBKDF2 ${PBKDF2_ITERATIONS} itérations)`);
}

await main();
