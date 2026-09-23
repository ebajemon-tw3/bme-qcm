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

export interface Bundle {
  version: 1;
  generatedAt: string;
  subjects: Subject[];
  deadlines: Deadline[];
  undated: UndatedDeadline[];
  questions: Record<string, Question[]>;
}
