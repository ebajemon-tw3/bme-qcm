"use client";

import * as React from "react";
import { ActionBar } from "@/components/quiz/action-bar";
import { QuestionTurn } from "@/components/quiz/question-turn";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SessionRecord } from "@/lib/history";
import type { Question } from "@/lib/types";

// Rejeu d'une session terminée, question par question : réponse donnée, bonne réponse, justification.
export function SessionReplay({ session, bank }: { session: SessionRecord; bank: Question[] }) {
  const byId = React.useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank]);
  const wrong = session.answers.filter((a) => !a.correct).length;
  const [errorsOnly, setErrorsOnly] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const items = errorsOnly ? session.answers.filter((a) => !a.correct) : session.answers;
  const index = Math.min(position, Math.max(items.length - 1, 0));
  const current = items[index];
  const question = current ? byId.get(current.questionId) : undefined;

  const move = React.useCallback(
    (step: number) => setPosition((p) => Math.max(0, Math.min(items.length - 1, p + step))),
    [items.length],
  );

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  return (
    <div className="flex flex-col gap-6">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={1}
        className="grid w-full grid-cols-2 sm:w-fit"
        value={errorsOnly ? "errors" : "all"}
        onValueChange={(value) => {
          if (!value) return;
          setErrorsOnly(value === "errors");
          setPosition(0);
        }}
      >
        <ToggleGroupItem value="all" className="h-11 sm:h-9">
          Toutes ({session.answers.length})
        </ToggleGroupItem>
        <ToggleGroupItem value="errors" className="h-11 sm:h-9" disabled={wrong === 0}>
          Erreurs ({wrong})
        </ToggleGroupItem>
      </ToggleGroup>

      {!current ? (
        <p className="text-sm text-muted-foreground">Aucune question dans cette sélection.</p>
      ) : question ? (
        <QuestionTurn
          key={`${question.id}-${index}`}
          question={question}
          position={session.answers.indexOf(current) + 1}
          total={session.answers.length}
          selected={current.selected}
          reveal
          timeMs={current.timeMs}
          flagged={current.flagged}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          La question {current.questionId} (section {current.section}) n&apos;est plus dans la banque publiée. Réponse
          donnée : {current.selected.join(", ") || "aucune"}, {current.correct ? "juste" : "fausse"}.
        </p>
      )}

      <ActionBar label="Navigation dans la session">
        <Button variant="outline" size="lg" className="h-11 flex-1" onClick={() => move(-1)} disabled={index === 0}>
          Précédente
        </Button>
        <span className="px-2 text-sm tabular-nums text-muted-foreground" aria-live="polite">
          {items.length ? index + 1 : 0}/{items.length}
        </span>
        <Button
          variant="outline"
          size="lg"
          className="h-11 flex-1"
          onClick={() => move(1)}
          disabled={index >= items.length - 1}
        >
          Suivante
        </Button>
      </ActionBar>
    </div>
  );
}
