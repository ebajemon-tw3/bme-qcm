"use client";

// Historique des sessions, conservé dans le localStorage du navigateur.
// Il ne contient que des identifiants de questions et des réponses, jamais de texte de cours.
import { useSyncExternalStore } from "react";
import type { Mode, Order, ScopeKind } from "@/lib/quiz";

export interface AnswerRecord {
  questionId: string;
  chapter: number;
  topic: string;
  section: string;
  selected: string[];
  correct: boolean;
  timeMs: number;
  flagged: boolean;
}

export interface SessionRecord {
  id: string;
  subject: string;
  mode: Mode;
  order: Order;
  scope: { kind: ScopeKind; label: string };
  startedAt: string;
  endedAt: string;
  durationMs: number;
  answers: AnswerRecord[];
}

export interface HistoryData {
  version: 1;
  sessions: SessionRecord[];
  flags: Record<string, string[]>;
}

const KEY = "bmeqcm.history.v1";
const EMPTY: HistoryData = { version: 1, sessions: [], flags: {} };

let cache: HistoryData | null = null;
const listeners = new Set<() => void>();

function read(): HistoryData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? parseHistory(JSON.parse(raw)) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: HistoryData) {
  localStorage.setItem(KEY, JSON.stringify(next));
  cache = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useHistory() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveSession(session: SessionRecord) {
  const current = read();
  write({ ...current, sessions: [...current.sessions.filter((s) => s.id !== session.id), session] });
}

export function setFlag(subject: string, questionId: string, flagged: boolean) {
  const current = read();
  const ids = new Set(current.flags[subject] ?? []);
  if (flagged) ids.add(questionId);
  else ids.delete(questionId);
  write({ ...current, flags: { ...current.flags, [subject]: [...ids] } });
}

export function clearHistory() {
  write(EMPTY);
}

export function exportHistory() {
  const current = read();
  return JSON.stringify({ app: "bme-qcm", exportedAt: new Date().toISOString(), ...current }, null, 2);
}

// Fusion : les sessions déjà présentes (même id) sont ignorées, les marques sont réunies.
export function importHistory(text: string) {
  const incoming = parseHistory(JSON.parse(text));
  const current = read();
  const known = new Set(current.sessions.map((s) => s.id));
  const added = incoming.sessions.filter((s) => !known.has(s.id));
  const flags = { ...current.flags };
  for (const [subject, ids] of Object.entries(incoming.flags)) {
    flags[subject] = [...new Set([...(flags[subject] ?? []), ...ids])];
  }
  write({ version: 1, sessions: [...current.sessions, ...added], flags });
  return { added: added.length, skipped: incoming.sessions.length - added.length };
}

function parseHistory(value: unknown): HistoryData {
  const data = value as Partial<HistoryData> | null;
  if (!data || data.version !== 1 || !Array.isArray(data.sessions)) {
    throw new Error("Ce fichier n'est pas un export d'historique de ce site.");
  }
  for (const s of data.sessions) {
    const valid =
      typeof s?.id === "string" &&
      typeof s.subject === "string" &&
      (s.mode === "training" || s.mode === "exam") &&
      typeof s.endedAt === "string" &&
      typeof s.durationMs === "number" &&
      Array.isArray(s.answers) &&
      s.answers.every(
        (a) => typeof a?.questionId === "string" && typeof a.correct === "boolean" && Array.isArray(a.selected),
      );
    if (!valid) throw new Error("Export d'historique invalide : une session est incomplète.");
  }
  const flags = data.flags && typeof data.flags === "object" ? data.flags : {};
  return { version: 1, sessions: data.sessions, flags };
}
