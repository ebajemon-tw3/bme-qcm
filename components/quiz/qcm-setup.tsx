"use client";

import * as React from "react";
import { useData } from "@/components/data-provider";
import { PageHeader } from "@/components/page-header";
import { ActionBar } from "@/components/quiz/action-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chapterRange, isoDay } from "@/lib/format";
import { useHistory } from "@/lib/history";
import { MODE_LABEL, newId, pickQuestions, type Mode, type Order, type ScopeKind } from "@/lib/quiz";
import type { RunState } from "@/lib/run-store";
import { blockLabel, nextBlock, resolveScope, SCOPE_PARAM, SCOPE_TITLE } from "@/lib/scope";
import { forSubject, questionTracks } from "@/lib/stats";

const COUNTS = [10, 20, 40];

export function QcmSetup({
  params,
  pending,
  onResume,
  onDiscard,
  onStart,
}: {
  params: URLSearchParams;
  pending: RunState | null;
  onResume: () => void;
  onDiscard: () => void;
  onStart: (run: RunState) => void;
}) {
  const { bundle } = useData();
  const history = useHistory();
  const today = isoDay(new Date());
  const available = bundle.subjects.filter((s) => (bundle.questions[s.code]?.length ?? 0) > 0);

  const requested = params.get("c");
  const [code, setCode] = React.useState(
    available.some((s) => s.code === requested) ? requested! : available[0]?.code ?? "",
  );
  const subject = bundle.subjects.find((s) => s.code === code);
  const bank = React.useMemo(() => bundle.questions[code] ?? [], [bundle, code]);
  const bankChapters = React.useMemo(() => [...new Set(bank.map((q) => q.chapter))].sort((a, b) => a - b), [bank]);

  const sessionId = params.get("s") ?? undefined;
  const [kind, setKind] = React.useState<ScopeKind>(
    () => SCOPE_PARAM[params.get("p") ?? ""] ?? (subject?.blocks.length ? "block" : "chapters"),
  );
  const [chapters, setChapters] = React.useState<number[]>(() =>
    (params.get("ch") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => bankChapters.includes(n)),
  );
  const [blockDate, setBlockDate] = React.useState(
    () => params.get("d") ?? (subject ? nextBlock(subject, today)?.date : undefined),
  );
  const [stillWrongOnly, setStillWrongOnly] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("training");
  const [order, setOrder] = React.useState<Order>("random");
  const [count, setCount] = React.useState("20");

  if (!subject) {
    return (
      <>
        <PageHeader title="QCM">Aucune matière n&apos;a de banque de questions dans les données publiées.</PageHeader>
        <p className="text-sm text-muted-foreground">
          Déposer un fichier <code>exams/questions.ts</code> ou <code>exams/questions.json</code> dans le dossier
          d&apos;une matière du dépôt cours, puis reconstruire le bundle (voir le README du dépôt du site).
        </p>
      </>
    );
  }

  const tracks = questionTracks(forSubject(history.sessions, code));
  const missedCount = [...tracks.values()].filter((t) => t.fails > 0).length;
  const flaggedCount = (history.flags[code] ?? []).filter((id) => bank.some((q) => q.id === id)).length;
  const kinds: ScopeKind[] = [
    "chapters",
    ...(subject.blocks.length ? (["block"] as const) : []),
    "missed",
    "flagged",
    ...(sessionId ? (["session"] as const) : []),
  ];

  const scope = kinds.includes(kind) ? kind : kinds[0];
  const { pool, label } = resolveScope(
    { kind: scope, chapters, blockDate, stillWrongOnly, sessionId },
    subject,
    bank,
    history,
  );
  const counts = COUNTS.filter((n) => n < pool.length);
  const effective = count === "all" || Number(count) >= pool.length ? pool.length : Number(count);
  const emptyReason = {
    chapters: "Choisir au moins un chapitre.",
    block: "Aucune séance du planning n'a de chapitres.",
    missed: "Aucune question ratée sur cette matière pour l'instant.",
    flagged: "Aucune question marquée sur cette matière.",
    session: "Cette session n'a pas d'erreur à refaire.",
  }[scope];

  function changeSubject(next: string) {
    const target = bundle.subjects.find((s) => s.code === next);
    if (!target) return;
    setCode(next);
    setChapters([]);
    setBlockDate(nextBlock(target, today)?.date);
    if ((kind === "block" && !target.blocks.length) || kind === "session") {
      setKind(target.blocks.length ? "block" : "chapters");
    }
  }

  function start(event: React.FormEvent) {
    event.preventDefault();
    if (pool.length === 0) return;
    const picked = pickQuestions(pool, order, effective);
    onStart({
      id: newId(),
      subject: code,
      mode,
      order,
      scope: { kind: scope, label },
      questionIds: picked.map((q) => q.id),
      index: 0,
      answers: {},
      startedAt: new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={start} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8">
      <PageHeader title="Nouveau QCM">
        La réponse et la justification n&apos;apparaissent qu&apos;après validation.
      </PageHeader>

      {pending ? (
        <Alert>
          <AlertTitle>Session en cours</AlertTitle>
          <AlertDescription>
            <p>
              {bundle.subjects.find((s) => s.code === pending.subject)?.sigle ?? pending.subject}, {pending.scope.label},{" "}
              {MODE_LABEL[pending.mode].toLowerCase()}, question {pending.index + 1} sur {pending.questionIds.length}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="lg" onClick={onResume}>
                Reprendre
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={onDiscard}>
                Abandonner
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-8">
        <Field>
          <FieldLabel htmlFor="subject">Matière</FieldLabel>
          <NativeSelect id="subject" className="w-full" value={code} onChange={(e) => changeSubject(e.target.value)}>
            {bundle.subjects.map((s) => {
              const n = bundle.questions[s.code]?.length ?? 0;
              return (
                <NativeSelectOption key={s.code} value={s.code} disabled={n === 0}>
                  {s.sigle ?? s.code}, {s.title} ({n ? `${n} questions` : "aucune question"})
                </NativeSelectOption>
              );
            })}
          </NativeSelect>
        </Field>

        <FieldSet>
          <FieldLegend>Périmètre</FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={1}
            className="grid w-full grid-cols-2 sm:grid-cols-4"
            value={scope}
            onValueChange={(value) => value && setKind(value as ScopeKind)}
          >
            {kinds.map((k) => (
              <ToggleGroupItem key={k} value={k} className="h-11 sm:h-9">
                {SCOPE_TITLE[k]}
                {k === "missed" ? ` (${missedCount})` : k === "flagged" ? ` (${flaggedCount})` : ""}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {scope === "chapters" ? (
            <div className="flex flex-col gap-3">
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={1}
                className="grid w-full grid-cols-7 sm:grid-cols-10"
                value={chapters.map(String)}
                onValueChange={(values) => setChapters(values.map(Number).sort((a, b) => a - b))}
                aria-label="Chapitres"
              >
                {bankChapters.map((ch) => (
                  <ToggleGroupItem
                    key={ch}
                    value={String(ch)}
                    className="h-11 tabular-nums sm:h-9"
                    aria-label={`Chapitre ${ch}${subject.chapterTitles[ch] ? `, ${subject.chapterTitles[ch]}` : ""}`}
                  >
                    {ch}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setChapters(bankChapters)}>
                  Tout
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setChapters([])}>
                  Aucun
                </Button>
              </div>
              {chapters.length ? (
                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {chapters.map((ch) => (
                    <li key={ch}>
                      {ch}. {subject.chapterTitles[ch] ?? `Chapitre ${ch}`}, {bank.filter((q) => q.chapter === ch).length}{" "}
                      questions
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {scope === "block" ? (
            <Field>
              <FieldLabel htmlFor="block" className="sr-only">
                Séance
              </FieldLabel>
              <NativeSelect
                id="block"
                className="w-full"
                value={blockDate ?? ""}
                onChange={(e) => setBlockDate(e.target.value)}
              >
                {subject.blocks.map((b) => (
                  <NativeSelectOption key={b.date} value={b.date}>
                    {blockLabel(b)}, {b.label} ({bank.filter((q) => b.chapters.includes(q.chapter)).length} q.)
                    {b.date < today ? ", passée" : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Chapitres à préparer pour la séance, lus dans le planning de la matière.</FieldDescription>
            </Field>
          ) : null}

          {scope === "missed" ? (
            <Field orientation="horizontal">
              <Checkbox
                id="still-wrong"
                checked={stillWrongOnly}
                onCheckedChange={(checked) => setStillWrongOnly(checked === true)}
              />
              <FieldLabel htmlFor="still-wrong" className="font-normal">
                Seulement celles dont la dernière réponse est fausse
              </FieldLabel>
            </Field>
          ) : null}
        </FieldSet>

        <FieldSet>
          <FieldLegend>Mode</FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={1}
            className="grid w-full grid-cols-2"
            value={mode}
            onValueChange={(value) => value && setMode(value as Mode)}
          >
            {(["training", "exam"] as const).map((m) => (
              <ToggleGroupItem key={m} value={m} className="h-11 sm:h-9">
                {MODE_LABEL[m]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>
            {mode === "training"
              ? "Correction, justification Cisco et référence de section après chaque question."
              : "Aucune correction avant la remise. Réponses modifiables et questions marquables jusqu'à la fin."}
          </FieldDescription>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Nombre de questions</FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={1}
            className="grid w-full grid-cols-4"
            value={counts.includes(Number(count)) ? count : "all"}
            onValueChange={(value) => value && setCount(value)}
          >
            {counts.map((n) => (
              <ToggleGroupItem key={n} value={String(n)} className="h-11 tabular-nums sm:h-9">
                {n}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value="all" className="h-11 sm:h-9">
              Toutes
            </ToggleGroupItem>
          </ToggleGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Ordre</FieldLegend>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={1}
            className="grid w-full grid-cols-2"
            value={order}
            onValueChange={(value) => value && setOrder(value as Order)}
          >
            <ToggleGroupItem value="random" className="h-11 sm:h-9">
              Aléatoire
            </ToggleGroupItem>
            <ToggleGroupItem value="sequential" className="h-11 sm:h-9">
              Séquentiel
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>Séquentiel : ordre de la banque, chapitre par chapitre.</FieldDescription>
        </FieldSet>
      </FieldGroup>

      <ActionBar label="Lancer le QCM">
        <p aria-live="polite" className="min-w-0 flex-1 text-sm text-muted-foreground">
          {pool.length === 0
            ? emptyReason
            : `${effective} questions sur ${pool.length}${scope === "chapters" ? `, ${chapterRange(chapters)}` : ""}`}
        </p>
        <Button type="submit" size="lg" className="h-11 px-6" disabled={pool.length === 0}>
          Commencer
        </Button>
      </ActionBar>
    </form>
  );
}
