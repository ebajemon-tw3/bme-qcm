"use client";

import * as React from "react";
import { AnswerArea } from "@/components/exam/parts";
import { MdInline } from "@/components/md-inline";
import { MdTable } from "@/components/md-table";
import { Button } from "@/components/ui/button";
import { wordCount } from "@/lib/essays";
import { plural } from "@/lib/format";
import type { ExamQuestion } from "@/lib/types";

export function ModelAnswer({ question }: { question: ExamQuestion }) {
  const pts = (n: number) => `${String(n).replace(".", ",")} pt`;
  return (
    <div className="flex flex-col gap-3 border-t pt-4 text-sm leading-relaxed">
      <h4 className="text-sm font-semibold">Réponse modèle</h4>
      <div lang="en" className="flex flex-col gap-2">
        {question.answer.map((p, i) => (
          <p key={i}>
            <MdInline text={p} />
          </p>
        ))}
      </div>
      {question.table ? <MdTable table={question.table} caption={`Tableau de la réponse : ${question.title}`} /> : null}
      <h4 className="text-sm font-semibold">Points attendus</h4>
      <p className="text-xs text-muted-foreground">Barème proposé pour s&apos;auto-noter, pas celui de l&apos;enseignant.</p>
      <ul lang="en" className="flex flex-col gap-1">
        {question.points.map((p, i) => (
          <li key={i} className="flex items-baseline justify-between gap-4">
            <span>{p.text}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{pts(p.points)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Sources : {question.refs.join(" ; ")}.</p>
    </div>
  );
}

export function OpenQuestion({
  question,
  text,
  onText,
  revealed,
  onReveal,
  locked,
}: {
  question: ExamQuestion;
  text: string;
  onText: (v: string) => void;
  revealed: boolean;
  onReveal?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p lang="en" className="text-sm leading-relaxed">
        {question.prompt}
      </p>
      <AnswerArea
        label={`Réponse : ${question.title}`}
        value={text}
        onChange={onText}
        locked={locked}
        rows={8}
        lang="en"
        placeholder="Your answer..."
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{plural(wordCount(text), "mot")}</span>
        {onReveal ? (
          <Button size="lg" variant="outline" className="h-11 sm:h-9" onClick={() => onReveal(!revealed)}>
            {revealed ? "Masquer la réponse modèle" : "Voir la réponse modèle"}
          </Button>
        ) : null}
      </div>
      {revealed ? <ModelAnswer question={question} /> : null}
    </div>
  );
}
