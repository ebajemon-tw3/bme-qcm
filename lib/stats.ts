import { isoDay } from "@/lib/format";
import type { AnswerRecord, SessionRecord } from "@/lib/history";
import type { Question } from "@/lib/types";

export interface Tally {
  attempts: number;
  correct: number;
  seen: Set<string>;
}

export type Level = "chapter" | "topic" | "section";

export function successRate(tally: { attempts: number; correct: number }) {
  return tally.attempts ? tally.correct / tally.attempts : null;
}

export function sessionScore(session: SessionRecord) {
  return session.answers.length ? session.answers.filter((a) => a.correct).length / session.answers.length : 0;
}

export function byDate(sessions: SessionRecord[]) {
  return [...sessions].sort((a, b) => a.endedAt.localeCompare(b.endedAt));
}

export function forSubject(sessions: SessionRecord[], code?: string) {
  return code ? sessions.filter((s) => s.subject === code) : sessions;
}

export function tally(answers: AnswerRecord[]): Tally {
  const seen = new Set<string>();
  let correct = 0;
  for (const a of answers) {
    seen.add(a.questionId);
    if (a.correct) correct++;
  }
  return { attempts: answers.length, correct, seen };
}

// Nombre de jours consécutifs avec au moins une session, jusqu'à aujourd'hui ou hier.
export function streakDays(sessions: SessionRecord[], today: Date) {
  const days = new Set(sessions.map((s) => isoDay(new Date(s.endedAt))));
  const cursor = new Date(today);
  if (!days.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(isoDay(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function keyOf(level: Level, item: { chapter: number; topic: string; section: string }) {
  return level === "chapter" ? String(item.chapter) : level === "topic" ? item.topic : item.section;
}

export function groupAnswers(answers: AnswerRecord[], level: Level) {
  const groups = new Map<string, AnswerRecord[]>();
  for (const a of answers) {
    const key = keyOf(level, a);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return groups;
}

export interface WeakRow {
  key: string;
  label: string;
  bank: number;
  seen: number;
  attempts: number;
  correct: number;
  rate: number | null;
}

// Taux de réussite par chapitre, topic ou section. Les groupes jamais travaillés restent en fin de liste.
export function weakRows(
  questions: Question[],
  answers: AnswerRecord[],
  level: Level,
  chapterTitles: Record<number, string>,
): WeakRow[] {
  const labels = new Map<string, string>();
  const bank = new Map<string, number>();
  for (const q of questions) {
    const key = keyOf(level, q);
    bank.set(key, (bank.get(key) ?? 0) + 1);
    if (!labels.has(key)) {
      labels.set(
        key,
        level === "chapter" ? chapterTitles[q.chapter] ?? "" : level === "topic" ? q.topicTitle : q.sectionTitle,
      );
    }
  }
  const groups = groupAnswers(answers, level);
  const rows: WeakRow[] = [...new Set([...bank.keys(), ...groups.keys()])].map((key) => {
    const t = tally(groups.get(key) ?? []);
    return {
      key,
      label: labels.get(key) ?? "",
      bank: bank.get(key) ?? 0,
      seen: t.seen.size,
      attempts: t.attempts,
      correct: t.correct,
      rate: successRate(t),
    };
  });
  const natural = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });
  return rows.sort((a, b) => {
    if (a.rate === null || b.rate === null) {
      return a.rate === b.rate ? natural(a.key, b.key) : a.rate === null ? 1 : -1;
    }
    return a.rate - b.rate || b.attempts - a.attempts || natural(a.key, b.key);
  });
}

export interface QuestionTrack {
  questionId: string;
  attempts: number;
  fails: number;
  lastCorrect: boolean;
  lastAt: string;
}

export function questionTracks(sessions: SessionRecord[]) {
  const tracks = new Map<string, QuestionTrack>();
  for (const session of byDate(sessions)) {
    for (const a of session.answers) {
      const t = tracks.get(a.questionId) ?? {
        questionId: a.questionId,
        attempts: 0,
        fails: 0,
        lastCorrect: false,
        lastAt: "",
      };
      t.attempts++;
      if (!a.correct) t.fails++;
      t.lastCorrect = a.correct;
      t.lastAt = session.endedAt;
      tracks.set(a.questionId, t);
    }
  }
  return tracks;
}

export function mostMissed(sessions: SessionRecord[]) {
  return [...questionTracks(sessions).values()]
    .filter((t) => t.fails > 0)
    .sort((a, b) => b.fails - a.fails || b.fails / b.attempts - a.fails / a.attempts || b.lastAt.localeCompare(a.lastAt));
}
