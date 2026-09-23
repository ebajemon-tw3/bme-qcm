"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useData } from "@/components/data-provider";
import { PageHeader, Section } from "@/components/page-header";
import { ScoreChart } from "@/components/score-chart";
import { SessionTable } from "@/components/session-table";
import { StatGrid } from "@/components/stat-grid";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { dayTime, duration, percent, seconds } from "@/lib/format";
import { useHistory } from "@/lib/history";
import { byDate, forSubject, sessionScore, successRate, tally } from "@/lib/stats";

export function HistoryView() {
  const { bundle } = useData();
  const history = useHistory();
  const params = useSearchParams();
  const [code, setCode] = React.useState(params.get("c") ?? "");
  const [chapter, setChapter] = React.useState("");

  const sessions = byDate(forSubject(history.sessions, code || undefined));
  const answers = sessions.flatMap((s) => s.answers);
  const t = tally(answers);
  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const subject = bundle.subjects.find((s) => s.code === code);
  const withSessions = bundle.subjects.filter((s) => history.sessions.some((x) => x.subject === s.code));
  const chapters = [...new Set(answers.map((a) => a.chapter))].sort((a, b) => a - b);

  // Pour un chapitre, le score d'une session est calculé sur ses seules questions de ce chapitre.
  const points = sessions
    .map((s) => {
      const scoped = chapter ? s.answers.filter((a) => a.chapter === Number(chapter)) : s.answers;
      if (scoped.length === 0) return null;
      const value = chapter ? scoped.filter((a) => a.correct).length / scoped.length : sessionScore(s);
      return { label: dayTime(s.endedAt).slice(0, 10), value };
    })
    .filter((p): p is { label: string; value: number } => p !== null);

  return (
    <>
      <PageHeader title="Historique">
        Sessions enregistrées dans ce navigateur. Pour les retrouver sur un autre appareil : Réglages, export
        puis import.
      </PageHeader>
      <div className="flex flex-col gap-10">
        <Field className="max-w-md">
          <FieldLabel htmlFor="history-subject">Matière</FieldLabel>
          <NativeSelect
            id="history-subject"
            className="w-full"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setChapter("");
            }}
          >
            <NativeSelectOption value="">Toutes les matières</NativeSelectOption>
            {withSessions.map((s) => (
              <NativeSelectOption key={s.code} value={s.code}>
                {s.sigle ?? s.code}, {s.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <StatGrid
          items={[
            { label: "Sessions", value: String(sessions.length), hint: `${duration(totalMs)} de QCM au total` },
            { label: "Questions vues", value: String(t.seen.size), hint: `${t.attempts} réponses données` },
            {
              label: "Taux de réussite",
              value: percent(successRate(t)),
              hint: "réponses justes sur réponses données",
            },
            {
              label: "Temps par question",
              value: t.attempts ? seconds(totalMs / t.attempts) : "-",
              hint: "moyenne sur les sessions affichées",
            },
          ]}
        />

        <Section title="Progression">
          {code ? (
            <Field className="max-w-md">
              <FieldLabel htmlFor="history-chapter">Chapitre</FieldLabel>
              <NativeSelect
                id="history-chapter"
                className="w-full"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
              >
                <NativeSelectOption value="">Tous les chapitres</NativeSelectOption>
                {chapters.map((ch) => (
                  <NativeSelectOption key={ch} value={String(ch)}>
                    {ch}. {subject?.chapterTitles[ch] ?? ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">Choisir une matière pour filtrer par chapitre.</p>
          )}
          <ScoreChart
            points={points}
            title={`Score par session${subject ? `, ${subject.sigle ?? subject.code}` : ", toutes matières"}${chapter ? `, chapitre ${chapter}` : ""}`}
          />
        </Section>

        <Section title="Sessions">
          <SessionTable sessions={sessions} subjects={bundle.subjects} />
        </Section>
      </div>
    </>
  );
}
