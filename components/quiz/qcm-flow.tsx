"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useData } from "@/components/data-provider";
import { PageHeader, Section } from "@/components/page-header";
import { QcmRunner } from "@/components/quiz/qcm-runner";
import { QcmSetup } from "@/components/quiz/qcm-setup";
import { SessionReplay } from "@/components/quiz/session-replay";
import { SessionSummary } from "@/components/session-summary";
import { Button } from "@/components/ui/button";
import { dayTime } from "@/lib/format";
import { saveSession, type SessionRecord } from "@/lib/history";
import { newId } from "@/lib/quiz";
import { clearRun, loadRun, storeRun, type RunState } from "@/lib/run-store";

// Retire d'une session reprise les questions qui ne sont plus dans la banque publiée.
function sanitize(run: RunState | null, bank: Map<string, unknown>) {
  if (!run) return null;
  const questionIds = run.questionIds.filter((id) => bank.has(id));
  if (questionIds.length === 0) return null;
  return { ...run, questionIds, index: Math.min(run.index, questionIds.length - 1) };
}

export function QcmFlow() {
  const { bundle } = useData();
  const params = useSearchParams();
  const byId = React.useMemo(
    () => new Map(Object.values(bundle.questions).flat().map((q) => [q.id, q])),
    [bundle],
  );
  const [pending, setPending] = React.useState<RunState | null>(() => sanitize(loadRun(), byId));
  const [run, setRun] = React.useState<RunState | null>(null);
  const [result, setResult] = React.useState<SessionRecord | null>(null);

  function start(next: RunState) {
    storeRun(next);
    setPending(null);
    setResult(null);
    setRun(next);
  }

  function finish(session: SessionRecord) {
    saveSession(session);
    clearRun();
    setRun(null);
    setResult(session);
  }

  function quit() {
    clearRun();
    setRun(null);
  }

  if (run) {
    const subject = bundle.subjects.find((s) => s.code === run.subject)!;
    const questions = run.questionIds.map((id) => byId.get(id)!);
    return <QcmRunner key={run.id} initial={run} subject={subject} questions={questions} onFinish={finish} onQuit={quit} />;
  }

  if (result) {
    const subject = bundle.subjects.find((s) => s.code === result.subject);
    const wrong = result.answers.filter((a) => !a.correct).map((a) => a.questionId);
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <PageHeader title="Session terminée">Enregistrée dans l&apos;historique de ce navigateur.</PageHeader>
        <SessionSummary session={result} subject={subject} />
        <div className="flex flex-wrap gap-2">
          {wrong.length ? (
            <Button
              size="lg"
              className="h-11"
              onClick={() =>
                start({
                  id: newId(),
                  subject: result.subject,
                  mode: "training",
                  order: "random",
                  scope: { kind: "session", label: `Erreurs de la session du ${dayTime(result.endedAt)}` },
                  questionIds: wrong,
                  index: 0,
                  answers: {},
                  startedAt: new Date().toISOString(),
                })
              }
            >
              {wrong.length > 1 ? `Refaire les ${wrong.length} erreurs` : "Refaire l'erreur"}
            </Button>
          ) : null}
          <Button size="lg" variant="outline" className="h-11" onClick={() => setResult(null)}>
            Nouveau QCM
          </Button>
          <Button size="lg" variant="outline" className="h-11" asChild>
            <Link href="/historique">Historique</Link>
          </Button>
        </div>
        <Section title="Correction">
          <SessionReplay session={result} bank={bundle.questions[result.subject] ?? []} />
        </Section>
      </div>
    );
  }

  return (
    <QcmSetup
      key={params.toString()}
      params={params}
      pending={pending}
      onResume={() => {
        setRun(pending);
        setPending(null);
      }}
      onDiscard={() => {
        clearRun();
        setPending(null);
      }}
      onStart={start}
    />
  );
}
