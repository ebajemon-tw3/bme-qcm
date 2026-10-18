// Révision d'exam : exercices, réponses aux questions ouvertes et sujets blancs, conservés dans le
// localStorage du navigateur.

import * as React from "react";
import type { GeneratorId } from "@/lib/types";

export type Reveal = "none" | "check" | "solution";

export interface ExerciseState {
  seed: number;
  value: Record<string, string>;
  reveal: Reveal;
}

export type MockItem =
  | { session: number; kind: "generator"; generator: GeneratorId; seed: number }
  | { session: number; kind: "open"; questionId: string };

export interface MockState {
  id: string;
  code: string;
  startedAt: string;
  minutes: number | null;
  items: MockItem[];
  values: Record<number, Record<string, string>>;
  texts: Record<number, string>;
  finished: boolean;
  scores: Record<number, number>;
}

export interface MockResult {
  id: string;
  code: string;
  startedAt: string;
  endedAt: string;
  scores: number[];
  total: number;
}

export interface ExamStore {
  exercises: Record<string, ExerciseState>;
  answers: Record<string, string>;
  mock: MockState | null;
  results: MockResult[];
}

const KEY = "bme-exam-v1";
const EMPTY: ExamStore = { exercises: {}, answers: {}, mock: null, results: [] };
const listeners = new Set<() => void>();
let cache: ExamStore | null = null;

function read(): ExamStore {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<ExamStore>) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: ExamStore) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible : les réponses restent en mémoire jusqu'au rechargement
  }
  listeners.forEach((l) => l());
}

export function useExamStore() {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY,
  );
}

export function exerciseKey(code: string, generator: GeneratorId) {
  return `${code}:${generator}`;
}

export function setExercise(key: string, state: ExerciseState) {
  const store = read();
  write({ ...store, exercises: { ...store.exercises, [key]: state } });
}

export function setAnswer(questionId: string, text: string) {
  const store = read();
  write({ ...store, answers: { ...store.answers, [questionId]: text } });
}

export function setMock(mock: MockState | null) {
  write({ ...read(), mock });
}

export function updateMock(change: (mock: MockState) => MockState) {
  const store = read();
  if (store.mock) write({ ...store, mock: change(store.mock) });
}

export function saveMockResult(result: MockResult) {
  const store = read();
  write({ ...store, mock: null, results: [result, ...store.results.filter((r) => r.id !== result.id)] });
}

export function deleteMockResult(id: string) {
  const store = read();
  write({ ...store, results: store.results.filter((r) => r.id !== id) });
}
