"use client";

import Link from "next/link";
import { BlockCard } from "@/components/block-card";
import { useData } from "@/components/data-provider";
import { DeadlineList, upcoming } from "@/components/deadline-list";
import { PageHeader, Section } from "@/components/page-header";
import { SessionTable } from "@/components/session-table";
import { StatGrid } from "@/components/stat-grid";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dayTime, isoDay, percent } from "@/lib/format";
import { useHistory } from "@/lib/history";
import { nextBlock } from "@/lib/scope";
import { byDate, forSubject, streakDays, successRate, tally, weakRows } from "@/lib/stats";

export default function HomePage() {
  const { bundle } = useData();
  const history = useHistory();
  const now = new Date();
  const today = isoDay(now);
  const sessions = byDate(history.sessions);
  const t = tally(sessions.flatMap((s) => s.answers));
  const bankTotal = Object.values(bundle.questions).reduce((n, qs) => n + qs.length, 0);
  const lastSession = sessions[sessions.length - 1];

  const blocks = bundle.subjects
    .filter((s) => bundle.questions[s.code]?.length)
    .map((s) => ({ subject: s, block: nextBlock(s, today) }))
    .filter((x) => x.block && x.block.date >= today);

  const weakest = bundle.subjects
    .flatMap((s) =>
      weakRows(
        bundle.questions[s.code] ?? [],
        forSubject(sessions, s.code).flatMap((x) => x.answers),
        "chapter",
        s.chapterTitles,
      )
        .filter((r) => r.rate !== null)
        .map((r) => ({ ...r, subject: s })),
    )
    .sort((a, b) => a.rate! - b.rate! || b.attempts - a.attempts)
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Tableau de bord">Données publiées le {dayTime(bundle.generatedAt)}.</PageHeader>
      <div className="flex flex-col gap-10">
        <StatGrid
          items={[
            {
              label: "Questions vues",
              value: `${t.seen.size} / ${bankTotal}`,
              hint: "questions distinctes déjà répondues",
            },
            {
              label: "Taux de réussite",
              value: percent(successRate(t)),
              hint: t.attempts ? `sur ${t.attempts} réponses` : "aucune réponse",
            },
            {
              label: "Sessions",
              value: String(sessions.length),
              hint: lastSession ? `dernière le ${dayTime(lastSession.endedAt)}` : "aucune session",
            },
            {
              label: "Série en cours",
              value: `${streakDays(sessions, now)} j`,
              hint: "jours consécutifs avec au moins une session",
            },
          ]}
        />

        {blocks.length ? (
          <Section title="Prochaine séance à préparer">
            <div className="grid gap-3 md:grid-cols-2">
              {blocks.map(({ subject, block }) => (
                <BlockCard
                  key={subject.code}
                  subject={subject}
                  block={block!}
                  bank={bundle.questions[subject.code] ?? []}
                  answers={forSubject(sessions, subject.code).flatMap((s) => s.answers)}
                  today={today}
                />
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Échéances des 14 prochains jours">
          <DeadlineList deadlines={upcoming(bundle.deadlines, today, 14)} today={today} subjects={bundle.subjects} />
        </Section>

        <Section
          title="Chapitres les plus faibles"
          action={
            <Link href="/points-faibles" className="text-sm underline underline-offset-4">
              Points faibles
            </Link>
          }
        >
          {weakest.length ? (
            <Table>
              <caption className="sr-only">Chapitres au taux de réussite le plus bas</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Chapitre</TableHead>
                  <TableHead className="text-right">Réussite</TableHead>
                  <TableHead className="text-right">Réponses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weakest.map((r) => (
                  <TableRow key={`${r.subject.code}-${r.key}`}>
                    <TableCell className="whitespace-normal">
                      <span className="mr-2 text-muted-foreground">{r.subject.sigle ?? r.subject.code}</span>
                      {r.key}. {r.label}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{percent(r.rate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.attempts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Apparaît après la première session.</p>
          )}
        </Section>

        <Section
          title="Dernières sessions"
          action={
            <Link href="/historique" className="text-sm underline underline-offset-4">
              Historique
            </Link>
          }
        >
          {sessions.length ? (
            <SessionTable sessions={sessions.slice(-5)} subjects={bundle.subjects} />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Aucune session enregistrée dans ce navigateur.</p>
              <Button asChild size="lg" className="h-11">
                <Link href="/qcm">Lancer un QCM</Link>
              </Button>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
