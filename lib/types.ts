// Schéma du bundle déchiffré dans le navigateur. Produit par scripts/build-bundle.ts.

export type QuestionKind = "single" | "multiple";
export type QuestionOrigin = "check" | "quiz" | "other";

export interface Choice {
  id: string;
  text: string;
  correct: boolean;
}

// Même forme que exams/questions.ts du dépôt cours. Les textes sont repris tels quels.
export interface Question {
  id: string;
  chapter: number;
  section: string;
  sectionTitle: string;
  topic: string;
  topicTitle: string;
  origin: QuestionOrigin;
  kind: QuestionKind;
  prompt: string;
  choices: Choice[];
  explanation: string;
  /** Exhibit de la question, image externe (netacad.com). */
  image?: string;
}

export interface MdTable {
  headers: string[];
  rows: string[][];
}

// Bloc de séance : chapitres à préparer pour une séance, lus dans le planning de la matière.
export interface SessionBlock {
  date: string;
  label: string;
  chapters: number[];
}

// Fiche de révision exams/fiche-*.md, découpée en blocs au build.
export type DocBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; paragraphs: string[] }
  | { type: "table"; table: MdTable }
  | { type: "rule" };

export interface Sheet {
  slug: string;
  file: string;
  title: string;
  blocks: DocBlock[];
}

// Document PDF de révision exams/pdf/*.pdf, copié dans public/fiches/<code>/ au build.
export interface PdfDoc {
  file: string;
  title: string;
  kb: number;
}

// Générateurs d'exercices codés dans lib/exam-*.ts, cités par exams/exam-prep.json.
export const GENERATOR_IDS = ["xml", "ipv4", "lpm", "dijkstra"] as const;
export type GeneratorId = (typeof GENERATOR_IDS)[number];

export interface ExamPoint {
  text: string;
  points: number;
}

// Question ouverte type : énoncé et réponse modèle dans la langue du cours.
export interface ExamQuestion {
  id: string;
  title: string;
  prompt: string;
  answer: string[];
  table?: MdTable;
  points: ExamPoint[];
  refs: string[];
}

export interface ExamSession {
  session: number;
  title: string;
  generators: GeneratorId[];
  questions: ExamQuestion[];
}

// exams/exam-prep.json : révision d'un examen à questions ouvertes.
export interface ExamPrep {
  title: string;
  date: string;
  summary: string;
  // Nom d'une unité du sujet blanc, « séance » par défaut (« thème » quand l'examen suit des thèmes).
  unitLabel?: string;
  questionCount: number;
  pointsPerQuestion: number;
  passMark: number;
  sessions: ExamSession[];
}

// exams/examen-blanc.json : sujets blancs tirés au sort dans une liste fermée de questions de la banque.
export interface MockExam {
  id: string;
  date: string;
  title: string;
  summary: string;
  count: number;
  ids: string[];
  /** Barème à points négatifs : vrai/faux +1, -1 si faux, 0 sans réponse ; autres questions +1 ou 0. */
  penalty?: boolean;
  /** Les `bonus` premières questions du sujet sont des bonus, hors du total de base. */
  bonus?: number;
}

export interface Subject {
  code: string;
  slug: string;
  dir: string;
  title: string;
  sigle: string | null;
  identity: [string, string][];
  schedule: MdTable | null;
  teachers: MdTable | null;
  planning: MdTable | null;
  blocks: SessionBlock[];
  chapterTitles: Record<number, string>;
  questionSource: string | null;
  sheets?: Sheet[];
  pdfs?: PdfDoc[];
  examPrep?: ExamPrep;
  mocks?: MockExam[];
}

export interface Deadline {
  date: string;
  weekday: string;
  subjectLabel: string;
  codes: string[];
  event: string;
  type: string;
}

export interface UndatedDeadline {
  subjectLabel: string;
  codes: string[];
  event: string;
  status: string;
}

export interface Stay {
  start: string;
  end: string;
}

export interface Bundle {
  version: 1;
  generatedAt: string;
  subjects: Subject[];
  deadlines: Deadline[];
  undated: UndatedDeadline[];
  // Absent des bundles produits avant l'ajout de la section « Séjour » de calendrier.md.
  stay?: Stay | null;
  // Période d'enseignement, section « Semestre » de calendrier.md.
  semester?: Stay | null;
  questions: Record<string, Question[]>;
}
