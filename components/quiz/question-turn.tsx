"use client";

import * as React from "react";
import { GrokChoices } from "@/components/brainless/grok/grok-choices";
import { GrokEvent } from "@/components/brainless/grok/grok-event";
import { GrokMessage } from "@/components/brainless/grok/grok-message";
import { GrokTool } from "@/components/brainless/grok/grok-tool";
import { GrokTurnEnd } from "@/components/brainless/grok/grok-turn-end";
import { RichText } from "@/components/rich-text";
import { seconds } from "@/lib/format";
import { correctIds, isCorrect, KIND_LABEL } from "@/lib/quiz";
import type { Question } from "@/lib/types";

// Une question présentée comme un tour Grok : l'énoncé est le message de l'assistant, la réponse
// d'Elisha un message utilisateur, la correction une carte de résultat.
export function QuestionTurn({
  question,
  position,
  total,
  selected,
  onChange,
  reveal,
  timeMs,
  flagged,
  headingRef,
  live = false,
}: {
  question: Question;
  position: number;
  total: number;
  selected: string[];
  onChange?: (next: string[]) => void;
  reveal: boolean;
  timeMs?: number;
  flagged?: boolean;
  headingRef?: React.Ref<HTMLDivElement>;
  live?: boolean;
}) {
  const expected = correctIds(question);
  const right = isCorrect(question, selected);
  const promptId = `prompt-${question.id}`;

  return (
    <article aria-labelledby={promptId} className="flex flex-col gap-4">
      <GrokEvent label={`Question ${position}/${total}`}>
        ch. {question.chapter} · {KIND_LABEL[question.kind]}
        {question.kind === "multiple" ? `, ${expected.length} réponses attendues` : ""}
        {flagged ? <span className="text-warn"> · marquée</span> : null}
      </GrokEvent>

      <GrokMessage
        id={promptId}
        ref={headingRef}
        tabIndex={-1}
        lang="en"
        className="text-base leading-relaxed outline-none"
      >
        <RichText text={question.prompt} />
      </GrokMessage>

      <GrokChoices
        label={`Options de la question ${position}`}
        kind={question.kind}
        choices={question.choices.map((c) => ({ id: c.id, label: <RichText text={c.text} />, correct: c.correct }))}
        selected={selected}
        onChange={onChange}
        reveal={reveal}
        lang="en"
      />

      <div aria-live={live ? "polite" : undefined}>
      {reveal ? (
        <div className="flex flex-col gap-3">
          <GrokMessage role="user">{selected.length ? selected.join(", ") : "sans réponse"}</GrokMessage>
          <GrokTool
            variant="card"
            tone={right ? "ok" : "bad"}
            title={right ? "Juste" : `Faux, réponse attendue : ${expected.join(", ")}`}
          >
            <div className="flex flex-col gap-2">
              <p lang="en" className="text-(--term-fg)">
                <RichText text={question.explanation} />
              </p>
              <GrokTool verb="section" path={`${question.section} ${question.sectionTitle}`} />
              <GrokTool verb="topic" path={`${question.topic} ${question.topicTitle}`} />
            </div>
          </GrokTool>
          {timeMs !== undefined ? <GrokTurnEnd>Réponse en {seconds(timeMs)}.</GrokTurnEnd> : null}
        </div>
      ) : null}
      </div>
    </article>
  );
}
