"use client";

import * as React from "react";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { dayTime, isoDay, plural } from "@/lib/format";
import {
  createEssay,
  deleteEssay,
  essaysToMarkdown,
  PROMPTS,
  TARGET_MINUTES,
  underlinedCount,
  updateEssay,
  useEssays,
  wordCount,
} from "@/lib/essays";
import { cn } from "@/lib/utils";

function Timer({ startedAt }: { startedAt: number }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = TARGET_MINUTES * 60 - Math.floor((now - startedAt) / 1000);
  const abs = Math.abs(left);
  const label = `${left < 0 ? "+" : ""}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  return <span className={cn("tabular-nums", left < 0 && "text-destructive")}>{label}</span>;
}

export function EssayView() {
  const essays = useEssays();
  const [promptId, setPromptId] = React.useState(PROMPTS[0].id);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const active = essays.find((e) => e.id === activeId) ?? null;

  function start() {
    const prompt = PROMPTS.find((p) => p.id === promptId)!;
    const essay = createEssay(prompt);
    setActiveId(essay.id);
    setStartedAt(Date.now());
    setMessage(null);
  }

  function download() {
    const blob = new Blob([essaysToMarkdown(essays)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ethics-essais-${isoDay(new Date())}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`${plural(essays.length, "essai exporté", "essais exportés")} dans Téléchargements.`);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(essaysToMarkdown(essays));
      setMessage("Essais copiés : à coller dans la conversation pour la correction.");
    } catch {
      setMessage("Copie impossible dans ce navigateur, utiliser le téléchargement.");
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <PageHeader title="Essais Ethics">
        1er midterm, 2026-10-12. Deux essais en 45 minutes, soit {TARGET_MINUTES} minutes chacun. Texte continu, 4 à 5 idées
        clés soulignées : les entourer de **deux astérisques**. Sauvegarde automatique dans ce navigateur.
      </PageHeader>

      <Section title="Nouvel essai">
        <div className="flex flex-col gap-3">
          <NativeSelect className="w-full" value={promptId} onChange={(e) => setPromptId(e.target.value)} aria-label="Sujet">
            {PROMPTS.map((p, i) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {i + 1}. [{p.source}] {p.text.slice(0, 90)}
                {p.text.length > 90 ? "..." : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="text-sm text-muted-foreground">{PROMPTS.find((p) => p.id === promptId)?.text}</p>
          <div>
            <Button size="lg" className="h-11" onClick={start}>
              Commencer, chrono {TARGET_MINUTES} min
            </Button>
          </div>
        </div>
      </Section>

      {active ? (
        <Section
          title="Essai en cours"
          action={
            <span className="text-sm text-muted-foreground">
              {startedAt ? <Timer startedAt={startedAt} /> : null} · {plural(wordCount(active.text), "mot")} ·{" "}
              {plural(underlinedCount(active.text), "idée soulignée", "idées soulignées")}
            </span>
          }
        >
          <p className="text-sm">{active.prompt}</p>
          <textarea
            value={active.text}
            onChange={(e) => updateEssay(active.id, e.target.value)}
            spellCheck
            lang="en"
            aria-label="Texte de l'essai"
            className="min-h-[60vh] w-full resize-y border border-input bg-transparent p-3 text-base leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
            placeholder="In my view, ..."
          />
          <div>
            <Button variant="outline" size="lg" className="h-11" onClick={() => { setActiveId(null); setStartedAt(null); }}>
              Terminer l&apos;essai
            </Button>
          </div>
        </Section>
      ) : null}

      <Section
        title={`Essais écrits (${essays.length})`}
        action={
          essays.length ? (
            <div className="flex flex-wrap gap-2">
              <Button size="lg" className="h-11" onClick={download}>
                Exporter pour correction
              </Button>
              <Button size="lg" variant="outline" className="h-11" onClick={copy}>
                Copier
              </Button>
            </div>
          ) : null
        }
      >
        {message ? <p className="text-sm">{message}</p> : null}
        {essays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun essai pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col divide-y border">
            {essays.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left hover:underline"
                  onClick={() => { setActiveId(e.id); setStartedAt(null); }}
                >
                  <span className="block truncate">{e.prompt}</span>
                  <span className="text-muted-foreground">
                    {dayTime(e.updatedAt)} · {plural(wordCount(e.text), "mot")} ·{" "}
                    {plural(underlinedCount(e.text), "idée soulignée", "idées soulignées")}
                  </span>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Supprimer cet essai ?")) {
                      deleteEssay(e.id);
                      if (activeId === e.id) setActiveId(null);
                    }
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
