"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokPrompt, le composeur arrondi de Grok : bordure CSS autour d'un vrai champ de saisie,
 * légende posée sur le bord inférieur comme une légende de fieldset.
 * Adapté de brainless : le champ accepte les attributs natifs (type, autocomplete...),
 * la légende est libre et la ligne de raccourcis Grok, sans objet ici, est retirée.
 */
export function GrokPrompt({
  legend,
  className,
  inputClassName,
  ...inputProps
}: {
  legend?: string;
  className?: string;
  inputClassName?: string;
} & Omit<React.ComponentProps<"input">, "className">) {
  return (
    <div className={cn("min-w-0 font-mono text-sm leading-normal", className)}>
      <div className="relative min-w-0 rounded-sm border border-(--term-border) bg-(--term-surface) px-2 py-2">
        <div className="flex min-w-0 items-center">
          <span aria-hidden className="shrink-0 text-(--term-fg)">
            ❯
          </span>
          <input
            {...inputProps}
            className={cn(
              "term-input min-w-0 flex-1 bg-transparent py-1 pl-[1ch] text-base text-(--term-fg) caret-(--term-fg) outline-none sm:text-sm",
              inputClassName,
            )}
          />
        </div>
        {legend ? (
          <span
            aria-hidden
            className="absolute -bottom-2.5 right-2 max-w-[calc(100%-1rem)] truncate bg-(--term-surface) px-1 text-xs text-(--term-dim) sm:right-3"
          >
            {legend}
          </span>
        ) : null}
      </div>
    </div>
  );
}
