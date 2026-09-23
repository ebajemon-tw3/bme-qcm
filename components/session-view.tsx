"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useData } from "@/components/data-provider";
import { PageHeader, Section } from "@/components/page-header";
import { SessionReplay } from "@/components/quiz/session-replay";
import { SessionSummary } from "@/components/session-summary";
import { Button } from "@/components/ui/button";
import { dayTime } from "@/lib/format";
import { useHistory } from "@/lib/history";

export function SessionView() {
  const { bundle } = useData();
  const history = useHistory();
  const id = useSearchParams().get("id");
  const session = history.sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <PageHeader title="Session introuvable">
        Cette session n&apos;est pas dans l&apos;historique de ce navigateur.{" "}
        <Link href="/historique" className="underline underline-offset-4">
          Historique
        </Link>
      </PageHeader>
    );
  }

  const subject = bundle.subjects.find((s) => s.code === session.subject);
  const wrong = session.answers.filter((a) => !a.correct).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader title={`Session du ${dayTime(session.endedAt)}`}>
        {subject ? `${subject.sigle ?? subject.code}, ${subject.title}` : session.subject}
      </PageHeader>
      <SessionSummary session={session} subject={subject} />
      {wrong ? (
        <Button asChild size="lg" className="h-11 w-full sm:w-fit">
          <Link href={`/qcm?c=${session.subject}&p=session&s=${session.id}`}>Refaire les {wrong} erreurs</Link>
        </Button>
      ) : null}
      <Section title="Question par question">
        <SessionReplay session={session} bank={bundle.questions[session.subject] ?? []} />
      </Section>
    </div>
  );
}
