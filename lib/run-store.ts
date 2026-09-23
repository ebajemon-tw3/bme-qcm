"use client";

// Session de QCM en cours, sauvegardée à chaque réponse pour survivre à un rechargement
// de l'onglet, fréquent sur téléphone.
import type { Mode, Order, ScopeKind } from "@/lib/quiz";

export interface RunAnswer {
  selected: string[];
  validated: boolean;
  timeMs: number;
}

export interface RunState {
  id: string;
  subject: string;
  mode: Mode;
  order: Order;
  scope: { kind: ScopeKind; label: string };
  questionIds: string[];
  index: number;
  answers: Record<string, RunAnswer>;
  startedAt: string;
}

const KEY = "bmeqcm.run.v1";

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RunState) : null;
  } catch {
    return null;
  }
}

export function storeRun(run: RunState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    // Stockage plein ou désactivé : la session continue en mémoire.
  }
}

export function clearRun() {
  localStorage.removeItem(KEY);
}
