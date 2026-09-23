import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokStatus, la barre d'état en tête d'écran Grok.
 * Adapté de brainless : contenu libre à gauche et à droite, le glyphe de branche Nerd Font est retiré.
 */
export function GrokStatus({
  label,
  left,
  right,
  className,
}: {
  label: string;
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-xs text-(--term-muted)",
        className,
      )}
      role="status"
      aria-label={label}
    >
      <div className="min-w-0 max-w-full truncate">{left}</div>
      {right ? <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 tabular-nums">{right}</div> : null}
    </div>
  );
}
