"use client";

import * as React from "react";
import { GENERATORS } from "@/components/exam/generators";
import { ModelAnswer, OpenQuestion } from "@/components/exam/open-question";
import { Section } from "@/components/page-header";
import { ActionBar } from "@/components/quiz/action-bar";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { suggestedScore, tally } from "@/lib/exam-check";
import { newSeed } from "@/lib/exam-rng";
import {
  deleteMockResult,
  saveMockResult,
  setMock,
  updateMock,
  useExamStore,
  type MockItem,
  type MockState,
} from "@/lib/exam-store";
import { dayTime, plural } from "@/lib/format";
import type { ExamPrep } from "@/lib/types";
import { cn } from "@/lib/utils";

const DURATIONS = [null, 45, 60, 90, 105];

function Clock({ startedAt, minutes }: { startedAt: string; minutes: number | null }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.floor((now - Date.parse(startedAt)) / 1000);
  const shown = minutes === null ? elapsed : minutes * 60 - elapsed;
  const abs = Math.abs(shown);
  const label = `${shown < 0 ? "+" : ""}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  return (
    <span className={cn("tabular-nums", minutes !== null && shown < 0 && "text-destructive")}>
      {label}
      {minutes === null ? " écoulées" : shown < 0 ? " de dépassement" : " restantes"}
    </span>
  );
}

function draw(prep: ExamPrep, code: string, minutes: number | null): MockState {
  const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  const items: MockItem[] = [...prep.sessions]
    .sort((a, b) => a.session - b.session)
    .map((s) =>
      s.generators.length
        ? { session: s.session, kind: "generator", generator: pick(s.generators), seed: newSeed() }
        : { session: s.session, kind: "open", questionId: pick(s.questions).id },
    );
  return {
    id: `${code}-${Date.now()}`,
    code,
    startedAt: new Date().toISOString(),
    minutes,
    items,
    values: {},
    texts: {},
    finished: false,
    scores: {},
  };
}

const fmt = (n: number) => String(n).replace(".", ",");

export function MockExam({ prep, code }: { prep: ExamPrep; code: string }) {
  const store = useExamStore();
  const mock = store.mock?.code === code ? store.mock : null;
  const results = store.results.filter((r) => r.code === code);
  const [minutes, setMinutes] = React.useState<string>("");
  const max = prep.pointsPerQuestion;
  const total = prep.questionCount * max;
  const questions = new Map(prep.sessions.flatMap((s) => s.questions.map((q) => [q.id, q] as const)));
  const sessions = new Map(prep.sessions.map((s) => [s.session, s]));
  const withGenerators = prep.sessions.filter((s) => s.generators.length).map((s) => s.session);

  if (!mock) {
    return (
      <div className="flex flex-col gap-10">
        <Section title="Nouveau sujet blanc">
          <p className="text-sm">
            {prep.questionCount} questions sur {max} points, une par séance : un exercice généré pour les séances{" "}
            {withGenerators.join(", ")}, une question ouverte tirée au hasard pour les autres. Corrigés et réponses modèles
            à la fin, puis une note sur {max} par question à se donner soi-même. Réussite à {prep.passMark}/{total}.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span>Minuteur</span>
              <NativeSelect className="w-full sm:w-56" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
                {DURATIONS.map((d) => (
                  <NativeSelectOption key={d ?? "none"} value={d ?? ""}>
                    {d ? `${d} minutes` : "Sans minuteur"}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <Button size="lg" className="h-11 sm:h-8" onClick={() => setMock(draw(prep, code, minutes ? Number(minutes) : null))}>
              Tirer un sujet
            </Button>
          </div>
        </Section>
        <Section title={`Sujets blancs notés (${results.length})`}>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col divide-y border-y">
              {results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    {dayTime(r.endedAt)} ·{" "}
                    <span className={cn("tabular-nums", r.total >= prep.passMark ? "text-ok" : "text-bad")}>
                      {fmt(r.total)}/{total}
                    </span>{" "}
                    <span className="text-muted-foreground">({r.scores.map(fmt).join(", ")})</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Supprimer ce résultat ?")) deleteMockResult(r.id);
                    }}
                  >
                    Supprimer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    );
  }

  const scored = mock.items.filter((_, i) => mock.scores[i] !== undefined).length;
  const sum = mock.items.reduce((acc, _, i) => acc + (mock.scores[i] ?? 0), 0);

  function abandon() {
    if (confirm("Abandonner ce sujet blanc ? Les réponses seront effacées.")) setMock(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Sujet tiré le {dayTime(mock.startedAt)}.{" "}
        {mock.finished ? "Corrigé ci-dessous : se noter question par question." : "Les corrigés apparaissent après « Terminer »."}
      </p>
      {mock.items.map((item, i) => {
        const session = sessions.get(item.session);
        const question = item.kind === "open" ? questions.get(item.questionId) : undefined;
        const heading = `Question ${i + 1}, séance ${item.session} : ${item.kind === "generator" ? GENERATORS[item.generator].title : (question?.title ?? "")}`;
        const auto = item.kind === "generator" && mock.finished ? GENERATORS[item.generator].check(item.seed, mock.values[i] ?? {}) : null;
        return (
          <section key={i} aria-label={heading} className="flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{heading}</h3>
              <span className="text-xs text-muted-foreground">
                {session?.title}, {max} points
              </span>
            </div>
            {item.kind === "generator" ? (
              (() => {
                const { Component } = GENERATORS[item.generator];
                return (
                  <Component
                    seed={item.seed}
                    value={mock.values[i] ?? {}}
                    onChange={(key, v) =>
                      updateMock((m) => ({ ...m, values: { ...m.values, [i]: { ...m.values[i], [key]: v } } }))
                    }
                    reveal={mock.finished ? "solution" : "none"}
                    locked={mock.finished}
                  />
                );
              })()
            ) : question ? (
              <OpenQuestion
                question={question}
                text={mock.texts[i] ?? ""}
                onText={(v) => updateMock((m) => ({ ...m, texts: { ...m.texts, [i]: v } }))}
                revealed={false}
                locked={mock.finished}
              />
            ) : (
              <p className="text-sm text-bad">Question introuvable dans les données publiées.</p>
            )}
            {mock.finished && question ? <ModelAnswer question={question} /> : null}
            {mock.finished ? (
              <div className="flex flex-col gap-2 border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">
                  {auto
                    ? `Correction automatique : ${tally(auto).ok} champs justes sur ${tally(auto).total}, soit ${fmt(suggestedScore(auto, max))} sur ${max} au prorata.`
                    : "Comparer avec les points attendus."}
                </span>
                <label className="flex items-center gap-2">
                  <span>Note</span>
                  <NativeSelect
                    className="w-28"
                    value={mock.scores[i] === undefined ? "" : String(mock.scores[i])}
                    onChange={(e) =>
                      updateMock((m) => {
                        const scores = { ...m.scores };
                        if (e.target.value === "") delete scores[i];
                        else scores[i] = Number(e.target.value);
                        return { ...m, scores };
                      })
                    }
                    aria-label={`Note de la question ${i + 1}`}
                  >
                    <NativeSelectOption value="">à noter</NativeSelectOption>
                    {Array.from({ length: max * 2 + 1 }, (_, k) => k / 2).map((n) => (
                      <NativeSelectOption key={n} value={String(n)}>
                        {fmt(n)} / {max}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            ) : null}
          </section>
        );
      })}

      <ActionBar label="Sujet blanc">
        {mock.finished ? (
          <>
            <span className="mr-auto text-sm">
              <span className={cn("tabular-nums", scored === mock.items.length && (sum >= prep.passMark ? "text-ok" : "text-bad"))}>
                {fmt(sum)}/{total}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · seuil {prep.passMark}
                {scored < mock.items.length ? ` · ${plural(mock.items.length - scored, "question", "questions")} à noter` : sum >= prep.passMark ? " · réussi" : " · sous le seuil"}
              </span>
            </span>
            <Button
              size="lg"
              className="h-11 sm:h-9"
              disabled={scored < mock.items.length}
              onClick={() =>
                saveMockResult({
                  id: mock.id,
                  code,
                  startedAt: mock.startedAt,
                  endedAt: new Date().toISOString(),
                  scores: mock.items.map((_, i) => mock.scores[i] ?? 0),
                  total: sum,
                })
              }
            >
              Enregistrer la note
            </Button>
            <Button size="lg" variant="outline" className="h-11 sm:h-9" onClick={abandon}>
              Abandonner
            </Button>
          </>
        ) : (
          <>
            <span className="mr-auto text-sm">
              <Clock startedAt={mock.startedAt} minutes={mock.minutes} />
            </span>
            <Button
              size="lg"
              className="h-11 sm:h-9"
              onClick={() => {
                if (confirm("Terminer et afficher les corrigés ?")) updateMock((m) => ({ ...m, finished: true }));
              }}
            >
              Terminer et corriger
            </Button>
            <Button size="lg" variant="outline" className="h-11 sm:h-9" onClick={abandon}>
              Abandonner
            </Button>
          </>
        )}
      </ActionBar>
    </div>
  );
}
