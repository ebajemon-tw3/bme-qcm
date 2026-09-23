import type { Question } from "@/lib/types";

export type Mode = "training" | "exam";
export type Order = "sequential" | "random";
export type ScopeKind = "chapters" | "block" | "missed" | "flagged" | "session";

export const MODE_LABEL: Record<Mode, string> = {
  training: "Entraînement",
  exam: "Examen blanc",
};

export const KIND_LABEL = {
  single: "choix unique",
  multiple: "choix multiple",
} as const;

export function correctIds(question: Question) {
  return question.choices.filter((c) => c.correct).map((c) => c.id);
}

// Tout ou rien : une question à choix multiple n'est juste que si l'ensemble coché est exact.
export function isCorrect(question: Question, selected: string[]) {
  const expected = correctIds(question);
  return selected.length === expected.length && expected.every((id) => selected.includes(id));
}

export function shuffle<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickQuestions(pool: Question[], order: Order, count: number) {
  const ordered = order === "random" ? shuffle(pool) : pool;
  return ordered.slice(0, Math.max(1, Math.min(count, pool.length)));
}

export function newId() {
  return crypto.randomUUID();
}
