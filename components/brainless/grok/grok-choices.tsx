"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokChoices, liste d'options au format de la carte d'approbation Grok (GrokPermission) :
 * gouttière gauche, marqueurs (●)/(○) pour un choix unique, [x]/[ ] pour un choix multiple.
 * Choix unique : radiogroup, flèches pour se déplacer. Choix multiple : groupe de cases à cocher,
 * espace pour cocher. En correction, chaque option porte un libellé texte, pas seulement une couleur.
 */
export interface GrokChoice {
  id: string;
  label: React.ReactNode;
  correct?: boolean;
}

export function GrokChoices({
  label,
  kind,
  choices,
  selected,
  onChange,
  reveal = false,
  lang,
  className,
}: {
  label: string;
  kind: "single" | "multiple";
  choices: GrokChoice[];
  selected: string[];
  onChange?: (next: string[]) => void;
  reveal?: boolean;
  lang?: string;
  className?: string;
}) {
  const interactive = Boolean(onChange) && !reveal;
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);
  const focusIndex = Math.max(
    0,
    choices.findIndex((c) => selected.includes(c.id)),
  );

  function choose(id: string) {
    if (!interactive) return;
    if (kind === "single") onChange!([id]);
    else onChange!(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    if (!interactive) return;
    if (event.key === " ") {
      event.preventDefault();
      choose(choices[index].id);
      return;
    }
    if (kind !== "single") return;
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + choices.length) % choices.length;
    refs.current[next]?.focus();
    onChange!([choices[next].id]);
  }

  return (
    <div
      role={kind === "single" ? "radiogroup" : "group"}
      aria-label={label}
      aria-readonly={interactive ? undefined : true}
      className={cn("flex flex-col border-l-2 border-(--term-border) font-mono text-base sm:text-sm", className)}
    >
      {choices.map((choice, index) => {
        const checked = selected.includes(choice.id);
        const marker = kind === "single" ? (checked ? "(●)" : "(○)") : checked ? "[x]" : "[ ]";
        const verdict = reveal ? (choice.correct ? "ok" : checked ? "bad" : null) : null;
        return (
          <div
            key={choice.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role={kind === "single" ? "radio" : "checkbox"}
            aria-checked={checked}
            tabIndex={interactive ? (kind === "multiple" || index === focusIndex ? 0 : -1) : undefined}
            onClick={() => choose(choice.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex min-h-11 items-baseline gap-3 py-2.5 pr-2 pl-3 leading-relaxed outline-none focus-visible:bg-white/5 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-(--term-muted)",
              interactive && "cursor-pointer hover:bg-white/5",
              checked ? "text-(--term-fg)" : "text-(--term-muted)",
              checked && !reveal && "font-semibold",
            )}
          >
            <span aria-hidden className="shrink-0 tabular-nums">
              {choice.id}{" "}
              <span className={checked ? "text-(--term-fg)" : "text-(--term-dim)"}>{marker}</span>
            </span>
            <span className="min-w-0 flex-1 break-words">
              <span lang={lang}>{choice.label}</span>
              {verdict === "ok" ? <span className="block text-xs text-ok">bonne réponse</span> : null}
              {verdict === "bad" ? <span className="block text-xs text-bad">faux</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
