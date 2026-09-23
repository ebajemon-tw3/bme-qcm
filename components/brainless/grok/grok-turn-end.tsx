import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokTurnEnd, le pied de tour que Grok affiche après ◆ stop.
 * Adapté de brainless : le texte est fourni par l'appelant.
 */
export function GrokTurnEnd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("font-mono text-sm leading-relaxed text-(--term-muted)", className)} role="status">
      {children}
    </p>
  );
}
