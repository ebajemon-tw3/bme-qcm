"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { FieldResult } from "@/lib/exam-check";
import type { Reveal } from "@/lib/exam-store";
import { cn } from "@/lib/utils";

// Champ de saisie d'un exercice. `result` n'est fourni qu'après « Vérifier ».
export function AnswerInput({
  id,
  label,
  value,
  onChange,
  result,
  locked,
  className,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  result?: FieldResult;
  locked?: boolean;
  className?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      id={id}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      readOnly={locked}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={result ? !result.ok : undefined}
      className={cn(
        "h-11 w-full min-w-0 border border-input bg-transparent px-2 text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 sm:h-9 sm:text-sm dark:bg-input/30",
        result?.ok && "border-ok",
        result && !result.ok && "border-bad",
        locked && "text-muted-foreground",
        className,
      )}
    />
  );
}

const INDENT = "  ";

// Remplace la sélection par `text` en gardant l'historique d'annulation quand le navigateur le permet.
function insertText(el: HTMLTextAreaElement, text: string, onChange: (v: string) => void) {
  if (document.execCommand?.("insertText", false, text)) return;
  const { selectionStart: s, selectionEnd: e, value } = el;
  onChange(value.slice(0, s) + text + value.slice(e));
  requestAnimationFrame(() => el.setSelectionRange(s + text.length, s + text.length));
}

function replaceRange(
  el: HTMLTextAreaElement,
  from: number,
  to: number,
  text: string,
  onChange: (v: string) => void,
) {
  el.setSelectionRange(from, to);
  if (text ? document.execCommand?.("insertText", false, text) : document.execCommand?.("delete")) return;
  const pos = from + text.length;
  onChange(el.value.slice(0, from) + text + el.value.slice(to));
  requestAnimationFrame(() => el.setSelectionRange(pos, pos));
}

// Zone de code : Tab indente, Maj+Tab désindente, Entrée garde l'indentation de la ligne et
// l'augmente après « { », « [ » ou « : », « } » et « ] » en début de ligne reculent d'un cran.
function codeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, onChange: (v: string) => void) {
  const el = e.currentTarget;
  const { selectionStart: s, selectionEnd: end, value } = el;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    insertText(el, INDENT, onChange);
  } else if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    const n = value.slice(lineStart, lineStart + INDENT.length).match(/^ */)![0].length;
    if (!n) return;
    replaceRange(el, lineStart, lineStart + n, "", onChange);
    el.setSelectionRange(Math.max(lineStart, s - n), Math.max(lineStart, end - n));
  } else if ((e.key === "}" || e.key === "]") && s === end && /^ {2,}$/.test(value.slice(lineStart, s))) {
    e.preventDefault();
    replaceRange(el, s - INDENT.length, s, e.key, onChange);
  } else if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && !e.nativeEvent.isComposing) {
    e.preventDefault();
    const before = value.slice(lineStart, s);
    const indent = before.match(/^ */)![0];
    const opens = /[{[:]\s*$/.test(before);
    insertText(el, "\n" + indent + (opens ? INDENT : ""), onChange);
  }
}

export function AnswerArea({
  label,
  value,
  onChange,
  locked,
  rows = 10,
  lang,
  placeholder,
  invalid,
  code,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  locked?: boolean;
  rows?: number;
  lang?: string;
  placeholder?: string;
  invalid?: boolean;
  code?: boolean;
}) {
  return (
    <textarea
      aria-label={label}
      value={value}
      rows={rows}
      lang={lang}
      placeholder={placeholder}
      readOnly={locked}
      spellCheck={code ? false : lang === "en"}
      autoCapitalize="off"
      autoCorrect="off"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={code && !locked ? (e) => codeKeyDown(e, onChange) : undefined}
      aria-invalid={invalid}
      className={cn(
        "w-full resize-y border border-input bg-transparent p-3 text-base leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 sm:text-sm dark:bg-input/30",
        code && "font-mono [tab-size:2]",
        invalid === false && "border-ok",
        invalid && "border-bad",
        locked && "text-muted-foreground",
      )}
    />
  );
}

// Choix oui ou non, deux boutons à état.
export function YesNo({
  label,
  value,
  onChange,
  result,
  locked,
  disabled,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  result?: FieldResult;
  locked?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex border",
        result?.ok && "border-ok",
        result && !result.ok && "border-bad",
        disabled && "opacity-40",
      )}
    >
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled || locked}
          onClick={() => onChange(v)}
          className={cn(
            "h-11 min-w-11 px-2 text-sm sm:h-8 sm:min-w-9",
            value === v ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function Hint({ result }: { result?: FieldResult }) {
  if (!result || result.ok || !result.hint) return null;
  return <p className="text-xs text-bad">{result.hint}</p>;
}

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <pre className={cn("overflow-x-auto border bg-card p-3 text-sm leading-relaxed", className)}>
      <code>{children}</code>
    </pre>
  );
}

// Adresse en binaire, octets séparés par des points. Les `prefix` premiers bits en clair, les
// suivants grisés ; `upto` coupe l'affichage après ce nombre de bits.
export function Bits({ value, prefix, upto = 32 }: { value: number; prefix: number; upto?: number }) {
  const all = value.toString(2).padStart(32, "0");
  const groups: React.ReactNode[] = [];
  for (let o = 0; o * 8 < upto; o++) {
    const start = o * 8;
    const end = Math.min(start + 8, upto);
    const head = all.slice(start, Math.min(end, Math.max(start, prefix)));
    const tail = all.slice(start + head.length, end);
    groups.push(
      <React.Fragment key={o}>
        {o > 0 ? <span className="text-muted-foreground">.</span> : null}
        {head}
        {tail ? <span className="text-muted-foreground">{tail}</span> : null}
      </React.Fragment>,
    );
  }
  return <span className="whitespace-nowrap tabular-nums">{groups}</span>;
}

export function Verdict({ ok, total }: { ok: number; total: number }) {
  return (
    <p role="status" className={cn("text-sm", ok === total ? "text-ok" : "text-bad")}>
      {ok === total ? "Tout est juste." : `${ok} réponses justes sur ${total}.`}
    </p>
  );
}

// Boutons d'un exercice d'entraînement.
export function ExerciseActions({
  reveal,
  onReveal,
  onNew,
}: {
  reveal: Reveal;
  onReveal: (r: Reveal) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" className="h-11 sm:h-9" onClick={() => onReveal(reveal === "solution" ? "solution" : "check")}>
        Vérifier
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-11 sm:h-9"
        onClick={() => onReveal(reveal === "solution" ? "check" : "solution")}
      >
        {reveal === "solution" ? "Masquer le corrigé" : "Voir le corrigé"}
      </Button>
      <Button size="lg" variant="outline" className="h-11 sm:h-9" onClick={onNew}>
        Nouvel exercice
      </Button>
    </div>
  );
}

export function Statement({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en" className="flex flex-col gap-2 text-sm leading-relaxed">
      {children}
    </div>
  );
}

export function SolutionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en" className="flex flex-col gap-3 border-t pt-4 text-sm leading-relaxed">
      <h3 className="text-sm font-semibold" lang="fr">
        Corrigé
      </h3>
      {children}
    </div>
  );
}

export interface ExerciseProps {
  seed: number;
  value: Record<string, string>;
  onChange: (key: string, v: string) => void;
  reveal: Reveal;
  locked?: boolean;
}
