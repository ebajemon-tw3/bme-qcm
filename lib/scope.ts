import { chapterRange, dayTime } from "@/lib/format";
import type { HistoryData } from "@/lib/history";
import type { ScopeKind } from "@/lib/quiz";
import { forSubject, questionTracks } from "@/lib/stats";
import type { Question, SessionBlock, Subject } from "@/lib/types";

// Paramètre `p` de l'URL /qcm, en français pour rester lisible dans un lien.
export const SCOPE_PARAM: Record<string, ScopeKind> = {
  chapitres: "chapters",
  seance: "block",
  ratees: "missed",
  marquees: "flagged",
  session: "session",
};

export const SCOPE_TITLE: Record<ScopeKind, string> = {
  chapters: "Chapitres",
  block: "Séance",
  missed: "Ratées",
  flagged: "Marquées",
  session: "Session",
};

// Prochaine séance à préparer : la première dont la date n'est pas passée, sinon la dernière.
export function nextBlock(subject: Subject, today: string): SessionBlock | undefined {
  return subject.blocks.find((b) => b.date >= today) ?? subject.blocks[subject.blocks.length - 1];
}

export function blockLabel(block: SessionBlock) {
  return `Séance du ${block.date}, ${chapterRange(block.chapters)}`;
}

export interface ScopeInput {
  kind: ScopeKind;
  chapters: number[];
  blockDate?: string;
  stillWrongOnly: boolean;
  sessionId?: string;
}

export function resolveScope(
  input: ScopeInput,
  subject: Subject,
  bank: Question[],
  history: HistoryData,
): { pool: Question[]; label: string } {
  switch (input.kind) {
    case "chapters":
      return {
        pool: bank.filter((q) => input.chapters.includes(q.chapter)),
        label: `Sélection, ${chapterRange(input.chapters)}`,
      };
    case "block": {
      const block = subject.blocks.find((b) => b.date === input.blockDate);
      return block
        ? { pool: bank.filter((q) => block.chapters.includes(q.chapter)), label: blockLabel(block) }
        : { pool: [], label: "Séance" };
    }
    case "missed": {
      const tracks = questionTracks(forSubject(history.sessions, subject.code));
      const ids = new Set(
        [...tracks.values()].filter((t) => t.fails > 0 && (!input.stillWrongOnly || !t.lastCorrect)).map((t) => t.questionId),
      );
      return {
        pool: bank.filter((q) => ids.has(q.id)),
        label: input.stillWrongOnly ? "Questions encore fausses" : "Questions ratées",
      };
    }
    case "flagged": {
      const ids = new Set(history.flags[subject.code] ?? []);
      return { pool: bank.filter((q) => ids.has(q.id)), label: "Questions marquées" };
    }
    case "session": {
      const session = history.sessions.find((s) => s.id === input.sessionId);
      const ids = new Set(session?.answers.filter((a) => !a.correct).map((a) => a.questionId) ?? []);
      return {
        pool: bank.filter((q) => ids.has(q.id)),
        label: session ? `Erreurs de la session du ${dayTime(session.endedAt)}` : "Erreurs d'une session",
      };
    }
  }
}
