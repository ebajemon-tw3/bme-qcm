"use client";

import * as React from "react";
import { GrokStatus } from "@/components/brainless/grok/grok-status";
import { ActionBar } from "@/components/quiz/action-bar";
import { QuestionTurn } from "@/components/quiz/question-turn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { setFlag, useHistory, type AnswerRecord, type SessionRecord } from "@/lib/history";
import { isCorrect, MODE_LABEL } from "@/lib/quiz";
import { storeRun, type RunAnswer, type RunState } from "@/lib/run-store";
import type { Question, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY: RunAnswer = { selected: [], validated: false, timeMs: 0 };

// Ajoute `ms` au temps de la question affichée. En entraînement, le temps passé à lire
// la correction n'est pas compté.
function credit(run: RunState, ms: number): RunState {
  const id = run.questionIds[run.index];
  const answer = run.answers[id] ?? EMPTY;
  if (run.mode === "training" && answer.validated) return run;
  return { ...run, answers: { ...run.answers, [id]: { ...answer, timeMs: answer.timeMs + ms } } };
}

export function QcmRunner({
  initial,
  subject,
  questions,
  onFinish,
  onQuit,
}: {
  initial: RunState;
  subject: Subject;
  questions: Question[];
  onFinish: (session: SessionRecord) => void;
  onQuit: () => void;
}) {
  const history = useHistory();
  const flags = React.useMemo(() => new Set(history.flags[initial.subject] ?? []), [history.flags, initial.subject]);
  const [run, setRun] = React.useState(initial);
  const [dialog, setDialog] = React.useState<"finish" | "quit" | null>(null);
  const headingRef = React.useRef<HTMLDivElement>(null);
  const tick = React.useRef(0);

  const exam = run.mode === "exam";
  const question = questions[run.index];
  const answer = run.answers[question.id] ?? EMPTY;
  const last = run.index === questions.length - 1;
  const answeredCount = questions.filter((q) => (run.answers[q.id]?.selected.length ?? 0) > 0).length;
  const validated = questions.filter((q) => run.answers[q.id]?.validated);
  const correctCount = validated.filter((q) => isCorrect(q, run.answers[q.id].selected)).length;
  const flaggedCount = questions.filter((q) => flags.has(q.id)).length;

  React.useEffect(() => storeRun(run), [run]);

  React.useEffect(() => {
    tick.current = performance.now();
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [run.index]);

  // Onglet masqué : le chronomètre de la question s'arrête.
  React.useEffect(() => {
    const onVisibility = () => {
      const now = performance.now();
      if (document.visibilityState === "hidden") {
        const ms = now - tick.current;
        setRun((r) => credit(r, ms));
      }
      tick.current = now;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function flush() {
    const now = performance.now();
    const ms = now - tick.current;
    tick.current = now;
    return ms;
  }

  function select(next: string[]) {
    if (!exam && answer.validated) return;
    setRun((r) => ({
      ...r,
      answers: { ...r.answers, [question.id]: { ...(r.answers[question.id] ?? EMPTY), selected: next } },
    }));
  }

  function toggleChoice(id: string) {
    if (question.kind === "single") select([id]);
    else select(answer.selected.includes(id) ? answer.selected.filter((s) => s !== id) : [...answer.selected, id]);
  }

  function validate() {
    if (answer.selected.length === 0 || answer.validated) return;
    const ms = flush();
    setRun((r) => {
      const next = credit(r, ms);
      const current = next.answers[question.id] ?? EMPTY;
      return { ...next, answers: { ...next.answers, [question.id]: { ...current, validated: true } } };
    });
  }

  function goTo(index: number) {
    if (index < 0 || index >= questions.length || index === run.index) return;
    const ms = flush();
    setRun((r) => ({ ...credit(r, ms), index }));
  }

  function finish() {
    const final = credit(run, flush());
    const kept = questions.filter((q) => exam || final.answers[q.id]?.validated);
    const answers: AnswerRecord[] = kept.map((q) => {
      const a = final.answers[q.id] ?? EMPTY;
      return {
        questionId: q.id,
        chapter: q.chapter,
        topic: q.topic,
        section: q.section,
        selected: a.selected,
        correct: isCorrect(q, a.selected),
        timeMs: Math.round(a.timeMs),
        flagged: flags.has(q.id),
      };
    });
    if (answers.length === 0) {
      onQuit();
      return;
    }
    onFinish({
      id: run.id,
      subject: run.subject,
      mode: run.mode,
      order: run.order,
      scope: run.scope,
      startedAt: run.startedAt,
      endedAt: new Date().toISOString(),
      durationMs: answers.reduce((sum, a) => sum + a.timeMs, 0),
      answers,
    });
  }

  function primary() {
    if (exam) {
      if (last) setDialog("finish");
      else goTo(run.index + 1);
    } else if (!answer.validated) validate();
    else if (last) finish();
    else goTo(run.index + 1);
  }

  const toggleFlag = () => setFlag(run.subject, question.id, !flags.has(question.id));

  // Raccourcis clavier : 1 à 9 pour les options, Entrée pour l'action principale, m pour marquer.
  const onKey = React.useEffectEvent((event: KeyboardEvent) => {
    if (dialog || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, button, a, summary")) return;
    if (/^[1-9]$/.test(event.key)) {
      const choice = question.choices[Number(event.key) - 1];
      if (choice) toggleChoice(choice.id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      primary();
    } else if (event.key === "m") {
      toggleFlag();
    }
  });
  React.useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const primaryLabel = exam
    ? last
      ? "Remettre"
      : "Suivante"
    : !answer.validated
      ? "Valider"
      : last
        ? "Voir le résultat"
        : "Suivante";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex items-start gap-3">
        <GrokStatus
          className="flex-1"
          label="État de la session"
          left={`${subject.sigle ?? subject.code} · ${MODE_LABEL[run.mode]} · ${run.scope.label}`}
          right={
            <>
              <span>
                {run.index + 1}/{questions.length}
              </span>
              <span aria-hidden>│</span>
              <span>
                {exam ? `${answeredCount} répondues` : `${correctCount} justes sur ${validated.length}`}
              </span>
            </>
          }
        />
        <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => setDialog("quit")}>
          Quitter
        </Button>
      </div>

      <QuestionTurn
        key={question.id}
        question={question}
        position={run.index + 1}
        total={questions.length}
        selected={answer.selected}
        onChange={exam || !answer.validated ? select : undefined}
        reveal={!exam && answer.validated}
        timeMs={!exam && answer.validated ? answer.timeMs : undefined}
        flagged={flags.has(question.id)}
        headingRef={headingRef}
        live
      />

      {exam ? (
        <details className="border-t pt-3">
          <summary className="cursor-pointer py-2 text-sm">
            Toutes les questions : {answeredCount}/{questions.length} répondues
            {flaggedCount ? `, ${flaggedCount} marquées` : ""}
          </summary>
          <nav aria-label="Questions de l'examen" className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-10">
            {questions.map((q, i) => {
              const done = (run.answers[q.id]?.selected.length ?? 0) > 0;
              const marked = flags.has(q.id);
              return (
                <Button
                  key={q.id}
                  type="button"
                  variant={i === run.index ? "default" : done ? "secondary" : "outline"}
                  className={cn(
                    "h-11 tabular-nums sm:h-9",
                    !done && i !== run.index && "text-muted-foreground",
                    marked && i !== run.index && "text-warn",
                  )}
                  aria-current={i === run.index ? "step" : undefined}
                  aria-label={`Question ${i + 1}, ${done ? "répondue" : "sans réponse"}${marked ? ", marquée" : ""}`}
                  onClick={() => goTo(i)}
                >
                  {i + 1}
                </Button>
              );
            })}
          </nav>
          <p className="mt-2 text-xs text-muted-foreground">
            Fond gris, chiffre clair : répondue. Chiffre en ambre : marquée.
          </p>
        </details>
      ) : null}

      <ActionBar label="Actions de la question">
        {exam ? (
          <Button variant="outline" size="lg" className="h-11" onClick={() => goTo(run.index - 1)} disabled={run.index === 0}>
            Précédente
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="lg"
          className={cn("h-11", flags.has(question.id) && "text-warn")}
          aria-pressed={flags.has(question.id)}
          onClick={toggleFlag}
        >
          {flags.has(question.id) ? "Marquée" : "Marquer"}
        </Button>
        <Button
          size="lg"
          className="h-11 flex-1"
          onClick={primary}
          disabled={!exam && !answer.validated && answer.selected.length === 0}
        >
          {primaryLabel}
        </Button>
      </ActionBar>

      <AlertDialog open={dialog === "finish"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre la copie ?</AlertDialogTitle>
            <AlertDialogDescription>
              {questions.length - answeredCount > 0
                ? `${questions.length - answeredCount} questions sans réponse seront comptées fausses.`
                : "Toutes les questions ont une réponse."}
              {flaggedCount ? ` ${flaggedCount} questions sont marquées pour y revenir.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer l&apos;examen</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Remettre</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "quit"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter la session ?</AlertDialogTitle>
            <AlertDialogDescription>
              {!exam && validated.length > 0
                ? `Les ${validated.length} réponses validées peuvent être enregistrées dans l'historique.`
                : exam
                  ? "L'examen sera abandonné sans être noté. Pour le noter, utiliser Remettre."
                  : "Aucune réponse validée : rien ne sera enregistré."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onQuit}>
              Abandonner
            </AlertDialogAction>
            {!exam && validated.length > 0 ? (
              <AlertDialogAction onClick={finish}>Enregistrer et quitter</AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
