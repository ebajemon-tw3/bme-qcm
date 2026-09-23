import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokEvent, une ligne d'événement ◆ du transcript Grok.
 * Adapté de brainless : le compteur de hooks, sans objet ici, est retiré.
 */
export function GrokEvent({
  label,
  className,
  children,
}: {
  label: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 font-mono text-sm leading-relaxed", className)}>
      <span aria-hidden className="text-(--term-muted)">
        ◆
      </span>
      <span className="text-(--term-fg)">{label}</span>
      {children ? <span className="text-(--term-muted)">{children}</span> : null}
    </div>
  );
}
