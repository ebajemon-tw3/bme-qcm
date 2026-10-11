// Essais d'entraînement du 1er midterm Ethics, conservés dans le localStorage du navigateur.

import * as React from "react";

export interface EssayPrompt {
  id: string;
  source: "Moodle" | "Probable";
  text: string;
}

// Sujets publiés sur Moodle, puis sujets probables de exams/fiche-essais-modeles.md (dépôt cours).
export const PROMPTS: EssayPrompt[] = [
  { id: "kant-flaw", source: "Moodle", text: "Should an engineer report a known design flaw even if it delays the project? How does Kant's categorical imperative support your answer?" },
  { id: "util-av", source: "Moodle", text: "Should an autonomous vehicle prioritize passenger safety over pedestrian safety in an unavoidable accident? How would a utilitarian justify the decision?" },
  { id: "virtue-speak", source: "Moodle", text: "Should an engineer speak up against unethical workplace practices even if it risks their job? How would virtue ethics evaluate this decision?" },
  { id: "contract-practice", source: "Probable", text: "Is it acceptable for an engineer to follow a common practice in their industry if everyone else does the same, even when it may harm the public? How would contractualism evaluate this?" },
  { id: "rawls-site", source: "Probable", text: "A city must decide where to build a new hazardous industrial facility. Should engineers recommend the cheapest site, even if it is next to a poor neighbourhood? How would Rawls's theory of justice evaluate this decision?" },
  { id: "duty-code", source: "Probable", text: "Is following a professional code of ethics enough for an engineer to act ethically? Discuss using duty ethics." },
  { id: "rule-bridge", source: "Probable", text: "Should an engineer allow a 12-ton truck carrying emergency medical supplies to cross a bridge limited to 10 tons? How would a rule utilitarian evaluate this decision?" },
  { id: "intent-cons", source: "Probable", text: "Which matters more for judging an action morally: the intention behind it or its consequences? Compare Kantian ethics and utilitarianism." },
];

export const TARGET_MINUTES = 22;

export interface Essay {
  id: string;
  promptId: string;
  prompt: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

const KEY = "bme-ethics-essays-v1";
const listeners = new Set<() => void>();
let cache: Essay[] | null = null;
const EMPTY: Essay[] = [];

function read(): Essay[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Essay[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Essay[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible : l'essai reste en mémoire jusqu'au rechargement
  }
  listeners.forEach((l) => l());
}

export function useEssays() {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY,
  );
}

export function createEssay(prompt: EssayPrompt): Essay {
  const now = new Date().toISOString();
  const essay = { id: `${prompt.id}-${Date.now()}`, promptId: prompt.id, prompt: prompt.text, text: "", createdAt: now, updatedAt: now };
  write([essay, ...read()]);
  return essay;
}

export function updateEssay(id: string, text: string) {
  write(read().map((e) => (e.id === id ? { ...e, text, updatedAt: new Date().toISOString() } : e)));
}

export function deleteEssay(id: string) {
  write(read().filter((e) => e.id !== id));
}

export function wordCount(text: string) {
  return (text.trim().match(/\S+/g) ?? []).length;
}

// Idées soulignées notées **...** dans le texte.
export function underlinedCount(text: string) {
  return (text.match(/\*\*[^*]+\*\*/g) ?? []).length;
}

export function essaysToMarkdown(essays: Essay[]) {
  return essays
    .map(
      (e, i) =>
        `## Essay ${i + 1}\n\n**Question.** ${e.prompt}\n\nWritten ${e.createdAt.slice(0, 16).replace("T", " ")}, ${wordCount(e.text)} words, ${underlinedCount(e.text)} underlined ideas.\n\n${e.text.trim()}\n`,
    )
    .join("\n---\n\n");
}
