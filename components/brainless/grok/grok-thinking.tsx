"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokThinking, la ligne d'attente de Grok : spinner braille, verbe tournant, secondes écoulées.
 * Région live polie pour les lecteurs d'écran.
 * Adapté de brainless : couleurs sur les variables du thème, verbes fournis par l'appelant.
 */
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function GrokThinking({
  running = true,
  verbs,
  className,
}: {
  running?: boolean;
  verbs: string[];
  className?: string;
}) {
  const [frame, setFrame] = React.useState(0);
  const [secs, setSecs] = React.useState(0);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFrame((n) => (n + 1) % FRAMES.length), 90);
    return () => clearInterval(id);
  }, [running]);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!running) return null;

  return (
    <div role="status" aria-live="polite" className={cn("flex items-center gap-2 font-mono text-sm", className)}>
      <span aria-hidden className="w-[1ch] text-(--term-fg)">
        {FRAMES[frame]}
      </span>
      <span className="text-(--term-fg)">{verbs[Math.floor(secs / 2) % verbs.length]}…</span>
      <span className="text-(--term-muted)">({secs}s)</span>
    </div>
  );
}
