"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useData } from "@/components/data-provider";
import { PageHeader, Section } from "@/components/page-header";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dayTime, percent } from "@/lib/format";
import { setFlag, useHistory } from "@/lib/history";
import { forSubject, mostMissed, weakRows, type Level } from "@/lib/stats";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVELS: { value: Level; label: string; ref: string }[] = [
  { value: "chapter", label: "Chapitres", ref: "Chapitre" },
  { value: "topic", label: "Topics", ref: "Topic" },
  { value: "section", label: "Sections", ref: "Section" },
];

function Prompt({ question }: { question: Question }) {
  return (
    <p lang="en" className="line-clamp-3">
      <RichText text={question.prompt} />
    </p>
  );
}

export function WeakView() {
  const { bundle } = useData();
  const history = useHistory();
  const params = useSearchParams();
  const withBank = bundle.subjects.filter((s) => bundle.questions[s.code]?.length);
  const requested = params.get("c");
  const fallback = withBank.find((s) => history.sessions.some((x) => x.subject === s.code)) ?? withBank[0];
  const [code, setCode] = React.useState(
    withBank.some((s) => s.code === requested) ? requested! : fallback?.code ?? "",
  );
  const subject = bundle.subjects.find((s) => s.code === code);

  if (!subject) {
    return <PageHeader title="Points faibles">Aucune matière n&apos;a de banque de questions.</PageHeader>;
  }

  const bank = bundle.questions[subject.code] ?? [];
  const byId = new Map(bank.map((q) => [q.id, q]));
  const sessions = forSubject(history.sessions, subject.code);
  const answers = sessions.flatMap((s) => s.answers);
  const missed = mostMissed(sessions);
  const flagged = (history.flags[subject.code] ?? []).map((id) => byId.get(id)).filter((q): q is Question => !!q);

  return (
    <>
      <PageHeader title="Points faibles">
        Taux de réussite du plus faible au plus fort. Les groupes jamais travaillés sont en fin de liste.
      </PageHeader>
      <div className="flex flex-col gap-10">
        <Field className="max-w-md">
          <FieldLabel htmlFor="weak-subject">Matière</FieldLabel>
          <NativeSelect id="weak-subject" className="w-full" value={code} onChange={(e) => setCode(e.target.value)}>
            {withBank.map((s) => (
              <NativeSelectOption key={s.code} value={s.code}>
                {s.sigle ?? s.code}, {s.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Section title="Réussite par niveau">
          {answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune réponse sur cette matière pour l&apos;instant.</p>
          ) : (
            <Tabs defaultValue="chapter" className="gap-4">
              <TabsList>
                {LEVELS.map((l) => (
                  <TabsTrigger key={l.value} value={l.value} className="h-9 px-3">
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {LEVELS.map((level) => (
                <TabsContent key={level.value} value={level.value}>
                  <Table>
                    <caption className="sr-only">Taux de réussite par {level.ref.toLowerCase()}</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{level.ref}</TableHead>
                        <TableHead className="text-right">Réussite</TableHead>
                        <TableHead className="text-right">Réponses</TableHead>
                        <TableHead className="text-right">Vues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weakRows(bank, answers, level.value, subject.chapterTitles).map((row) => (
                        <TableRow key={row.key} className={cn(row.rate === null && "text-muted-foreground")}>
                          <TableCell className="whitespace-normal">
                            <span className="mr-2 tabular-nums">{row.key}</span>
                            {row.label}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              row.rate !== null && row.rate < 0.5 && "text-bad",
                            )}
                          >
                            {row.rate === null ? "jamais" : percent(row.rate)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.attempts}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.seen}/{row.bank}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          )}
          <p className="text-xs text-muted-foreground">
            En rouge : moins de 50 % de réponses justes. Vues : questions distinctes répondues sur le total de la
            banque.
          </p>
        </Section>

        <Section
          title={`Questions ratées (${missed.length})`}
          action={
            missed.length ? (
              <Button asChild size="lg" className="h-11">
                <Link href={`/qcm?c=${subject.code}&p=ratees`}>Série sur ces questions</Link>
              </Button>
            ) : null
          }
        >
          {missed.length ? (
            <ol className="flex flex-col divide-y border-y">
              {missed.map((track) => {
                const q = byId.get(track.questionId);
                return (
                  <li key={track.questionId} className="flex flex-col gap-1 py-3 text-sm">
                    {q ? <Prompt question={q} /> : <p>Question absente de la banque publiée.</p>}
                    <p className="text-xs text-muted-foreground tabular-nums">
                      <span className="text-bad">ratée {track.fails} fois</span> sur {track.attempts}
                      {q ? ` · ${q.section} ${q.sectionTitle}` : ""} · dernière réponse{" "}
                      {track.lastCorrect ? "juste" : "fausse"} le {dayTime(track.lastAt)}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune question ratée sur cette matière.</p>
          )}
        </Section>

        <Section
          title={`Questions marquées (${flagged.length})`}
          action={
            flagged.length ? (
              <Button asChild size="lg" variant="outline" className="h-11">
                <Link href={`/qcm?c=${subject.code}&p=marquees`}>Série sur ces questions</Link>
              </Button>
            ) : null
          }
        >
          {flagged.length ? (
            <ul className="flex flex-col divide-y border-y">
              {flagged.map((q) => (
                <li key={q.id} className="flex items-start gap-3 py-3 text-sm">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Prompt question={q} />
                    <p className="text-xs text-muted-foreground">
                      {q.section} {q.sectionTitle}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-9" onClick={() => setFlag(subject.code, q.id, false)}>
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune question marquée. Le bouton Marquer, pendant un QCM, les ajoute ici.
            </p>
          )}
        </Section>
      </div>
    </>
  );
}
