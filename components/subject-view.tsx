"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BlockCard } from "@/components/block-card";
import { useData } from "@/components/data-provider";
import { DeadlineList, upcoming } from "@/components/deadline-list";
import { MdInline } from "@/components/md-inline";
import { MdTable } from "@/components/md-table";
import { PageHeader, Section } from "@/components/page-header";
import { ScoreChart } from "@/components/score-chart";
import { SessionTable } from "@/components/session-table";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dayTime, isoDay, percent } from "@/lib/format";
import { useHistory } from "@/lib/history";
import { nextBlock } from "@/lib/scope";
import { byDate, forSubject, mostMissed, sessionScore, successRate, tally } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function SubjectView() {
  const { bundle } = useData();
  const history = useHistory();
  const code = useSearchParams().get("c");
  const subject = bundle.subjects.find((s) => s.code === code);

  if (!subject) {
    return (
      <PageHeader title="Matière introuvable">
        Aucune matière ne porte le code {code ?? "(vide)"} dans les données publiées.
      </PageHeader>
    );
  }

  const today = isoDay(new Date());
  const bank = bundle.questions[subject.code] ?? [];
  const sessions = byDate(forSubject(history.sessions, subject.code));
  const answers = sessions.flatMap((s) => s.answers);
  const chapters = [...new Set(bank.map((q) => q.chapter))].sort((a, b) => a - b);
  const multiple = bank.filter((q) => q.kind === "multiple").length;
  const block = nextBlock(subject, today);
  const missed = mostMissed(sessions).length;
  const flagged = (history.flags[subject.code] ?? []).length;
  const deadlines = upcoming(
    bundle.deadlines.filter((d) => d.codes.includes(subject.code)),
    today,
  );
  const undated = bundle.undated.filter((d) => d.codes.includes(subject.code));
  const dateCol = subject.planning?.headers.findIndex((h) => /^date/i.test(h)) ?? -1;

  return (
    <>
      <PageHeader title={subject.title}>
        {subject.code}
        {subject.sigle ? `, ${subject.sigle} dans le calendrier` : ""}. Fiche lue dans {subject.dir}/CLAUDE.md.
      </PageHeader>

      <div className="flex flex-col gap-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <Section title="Identité">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {subject.identity.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd>
                    <MdInline text={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
          <div className="flex flex-col gap-8">
            {subject.schedule ? (
              <Section title="Créneau et salle">
                <MdTable table={subject.schedule} caption="Créneau et salle" />
              </Section>
            ) : null}
            {subject.teachers ? (
              <Section title="Enseignants">
                <MdTable table={subject.teachers} caption="Enseignants" />
              </Section>
            ) : null}
          </div>
        </div>

        <Section title="Échéances à venir">
          <DeadlineList deadlines={deadlines} today={today} subjects={bundle.subjects} showSubject={false} />
          {undated.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs text-muted-foreground">Non datées</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {undated.map((d, i) => (
                  <li key={i}>
                    <MdInline text={d.event} />
                    <span className="text-muted-foreground"> · {d.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>

        {subject.planning ? (
          <Section title="Planning des séances">
            <details>
              <summary className="cursor-pointer py-2 text-sm text-muted-foreground">
                {subject.planning.rows.length} lignes, séances passées en gris
              </summary>
              <MdTable
                table={subject.planning}
                caption="Planning des séances"
                muted={(row) => dateCol !== -1 && /^\d{4}-\d{2}-\d{2}$/.test(row[dateCol]) && row[dateCol] < today}
              />
            </details>
          </Section>
        ) : null}

        <Section title="Banque de questions">
          {bank.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Pas encore de questions pour cette matière.</EmptyTitle>
                <EmptyDescription>
                  Pour en ajouter : déposer <code>{subject.dir}/exams/questions.ts</code> ou{" "}
                  <code>exams/questions.json</code> dans le dépôt cours, au format de la banque CyberOps, puis
                  reconstruire et publier le bundle. La procédure est dans le README du dépôt du site.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {bank.length} questions sur {chapters.length} chapitres, dont {multiple} à choix multiple. Source :{" "}
                {subject.questionSource}.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {block ? (
                  <div className="w-full">
                    <BlockCard subject={subject} block={block} bank={bank} answers={answers} today={today} />
                  </div>
                ) : null}
                <Button asChild variant="outline" size="lg" className="h-11">
                  <Link href={`/qcm?c=${subject.code}&p=chapitres&ch=${chapters.join(",")}`}>Toute la banque</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11">
                  <Link href={`/qcm?c=${subject.code}&p=ratees`}>Questions ratées ({missed})</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11">
                  <Link href={`/qcm?c=${subject.code}&p=marquees`}>Questions marquées ({flagged})</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11">
                  <Link href={`/points-faibles?c=${subject.code}`}>Points faibles</Link>
                </Button>
              </div>
              <Table>
                <caption className="sr-only">Couverture de la banque par chapitre</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chapitre</TableHead>
                    <TableHead className="text-right">Questions</TableHead>
                    <TableHead className="text-right">Vues</TableHead>
                    <TableHead className="text-right">Réussite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapters.map((ch) => {
                    const t = tally(answers.filter((a) => a.chapter === ch));
                    const n = bank.filter((q) => q.chapter === ch).length;
                    return (
                      <TableRow key={ch}>
                        <TableCell className="whitespace-normal">
                          <Link
                            href={`/qcm?c=${subject.code}&p=chapitres&ch=${ch}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {ch}. {subject.chapterTitles[ch] ?? ""}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{n}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", t.seen.size === 0 && "text-muted-foreground")}>
                          {t.seen.size}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{percent(successRate(t))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </Section>

        <Section title="Historique des scores">
          {sessions.length ? (
            <>
              <ScoreChart
                title={`Score par session, ${subject.sigle ?? subject.code}`}
                points={sessions.map((s) => ({ label: dayTime(s.endedAt).slice(0, 10), value: sessionScore(s) }))}
              />
              <SessionTable sessions={sessions} subjects={bundle.subjects} showSubject={false} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune session sur cette matière.</p>
          )}
        </Section>
      </div>
    </>
  );
}
