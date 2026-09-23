import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokTool, une action Grok.
 *   ligne : verbe discret suivi d'un chemin
 *   carte : gouttière gauche, ◆ et titre, contenu en dessous
 * Adapté de brainless : la couleur de la carte porte le résultat (juste, faux, neutre).
 */
const TONE = {
  ok: "var(--ok)",
  bad: "var(--bad)",
  warn: "var(--warn)",
  neutral: "var(--term-border)",
} as const;

export function GrokTool({
  verb,
  path,
  variant = "line",
  title,
  tone = "neutral",
  className,
  children,
}: {
  verb?: string;
  path?: string;
  variant?: "line" | "card";
  title?: React.ReactNode;
  tone?: keyof typeof TONE;
  className?: string;
  children?: React.ReactNode;
}) {
  if (variant === "card") {
    return (
      <div
        className={cn("min-w-0 border-l-2 pl-3 font-mono text-sm leading-relaxed", className)}
        style={{ borderColor: TONE[tone] }}
      >
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span aria-hidden className="shrink-0" style={{ color: TONE[tone] }}>
            ◆
          </span>
          <span className="min-w-0 break-words font-semibold text-(--term-fg)">{title}</span>
        </div>
        {children ? <div className="mt-1 min-w-0 break-words text-(--term-muted)">{children}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-baseline gap-x-2 font-mono text-sm leading-relaxed text-(--term-muted)",
        className,
      )}
    >
      {verb ? <span className="shrink-0">{verb}</span> : null}
      {path ? <span className="min-w-0 break-words text-(--term-fg)">{path}</span> : null}
      {children}
    </div>
  );
}
