"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useData } from "@/components/data-provider";
import { GENERATORS } from "@/components/exam/generators";
import { MockExam } from "@/components/exam/mock-exam";
import { OpenQuestion } from "@/components/exam/open-question";
import { ExerciseActions } from "@/components/exam/parts";
import { PageHeader, Section } from "@/components/page-header";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { newSeed } from "@/lib/exam-rng";
import { exerciseKey, setAnswer, setExercise, useExamStore, type ExerciseState } from "@/lib/exam-store";
import { daysBetween, inDays, isoDay } from "@/lib/format";
import type { ExamPrep, GeneratorId } from "@/lib/types";

const FIRST: ExerciseState = { seed: 1, value: {}, reveal: "none" };

function Practice({ prep, code }: { prep: ExamPrep; code: string }) {
  const store = useExamStore();
  const available = prep.sessions.flatMap((s) => s.generators.map((g) => ({ g, session: s.session })));
  const [current, setCurrent] = React.useState<GeneratorId>(available[0]?.g ?? "xml");
  if (available.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun générateur d&apos;exercices pour cette matière.</p>;
  }
  const key = exerciseKey(code, current);
  const state = store.exercises[key] ?? FIRST;
  const { Component } = GENERATORS[current];
  const session = available.find((a) => a.g === current)?.session;

  return (
    <div className="flex flex-col gap-6">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={1}
        className="grid w-full grid-cols-2 sm:grid-cols-4"
        value={current}
        onValueChange={(v) => v && setCurrent(v as GeneratorId)}
        aria-label="Type d'exercice"
      >
        {available.map(({ g, session: s }) => (
          <ToggleGroupItem key={g} value={g} className="h-11 whitespace-normal sm:h-9">
            {GENERATORS[g].title}
            <span className="sr-only">, séance {s}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Section
        title={`${GENERATORS[current].title}, séance ${session}`}
        action={<span className="text-xs text-muted-foreground tabular-nums">exercice n° {state.seed}</span>}
      >
        <Component
          key={`${current}-${state.seed}`}
          seed={state.seed}
          value={state.value}
          onChange={(k, v) => setExercise(key, { ...state, value: { ...state.value, [k]: v } })}
          reveal={state.reveal}
        />
        <ExerciseActions
          reveal={state.reveal}
          onReveal={(reveal) => setExercise(key, { ...state, reveal })}
          onNew={() => setExercise(key, { seed: newSeed(), value: {}, reveal: "none" })}
        />
        <p className="text-xs text-muted-foreground">Réponses gardées dans ce navigateur jusqu&apos;au prochain exercice.</p>
      </Section>
    </div>
  );
}

function Questions({ prep }: { prep: ExamPrep }) {
  const store = useExamStore();
  const [open, setOpen] = React.useState<Set<string>>(() => new Set());
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      {prep.sessions.map((s) => (
        <Section key={s.session} title={`Séance ${s.session} : ${s.title}`}>
          {s.generators.length ? (
            <p className="text-xs text-muted-foreground">
              Exercices générés pour cette séance (onglet Exercices) : {s.generators.map((g) => GENERATORS[g].title).join(", ")}.
            </p>
          ) : null}
          {s.questions.map((q) => (
            <article key={q.id} className="flex flex-col gap-3 border p-4">
              <h3 className="text-sm font-semibold">{q.title}</h3>
              <OpenQuestion
                question={q}
                text={store.answers[q.id] ?? ""}
                onText={(v) => setAnswer(q.id, v)}
                revealed={open.has(q.id)}
                onReveal={(v) =>
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (v) next.add(q.id);
                    else next.delete(q.id);
                    return next;
                  })
                }
              />
            </article>
          ))}
        </Section>
      ))}
    </div>
  );
}

export function ExamView() {
  const { bundle } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const store = useExamStore();
  const subjects = bundle.subjects.filter((s) => s.examPrep);
  const subject = subjects.find((s) => s.code === params.get("c")) ?? subjects[0];
  const [tab, setTab] = React.useState(() => (subject && store.mock?.code === subject.code ? "blanc" : "exercices"));

  if (!subject) {
    return (
      <PageHeader title="Révision d'exam">
        Aucune matière n&apos;a de fichier exams/exam-prep.json dans les données publiées.
      </PageHeader>
    );
  }

  const prep = subject.examPrep!;
  const days = daysBetween(isoDay(new Date()), prep.date);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Révision d'exam">
        {prep.title}, {prep.date}
        {days >= 0 ? `, ${inDays(days)}` : ", passé"}.
      </PageHeader>
      <div className="mb-6 flex flex-col gap-3">
        {subjects.length > 1 ? (
          <NativeSelect
            className="w-full sm:w-80"
            value={subject.code}
            onChange={(e) => router.replace(`/exam?c=${e.target.value}`)}
            aria-label="Matière"
          >
            {subjects.map((s) => (
              <NativeSelectOption key={s.code} value={s.code}>
                {s.sigle ?? s.code}, {s.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
        <p className="max-w-3xl text-sm">{prep.summary}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="flex-1 gap-6">
        <TabsList className="grid h-11 w-full grid-cols-3 sm:h-9 sm:w-fit">
          <TabsTrigger value="exercices" className="text-xs whitespace-normal sm:text-sm">
            Exercices
          </TabsTrigger>
          <TabsTrigger value="questions" className="text-xs whitespace-normal sm:text-sm">
            Questions types
          </TabsTrigger>
          <TabsTrigger value="blanc" className="text-xs whitespace-normal sm:text-sm">
            Sujet blanc
          </TabsTrigger>
        </TabsList>
        <TabsContent value="exercices" className="text-sm">
          <Practice prep={prep} code={subject.code} />
        </TabsContent>
        <TabsContent value="questions" className="text-sm">
          <Questions prep={prep} />
        </TabsContent>
        <TabsContent value="blanc" className="flex flex-col text-sm">
          <MockExam prep={prep} code={subject.code} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
