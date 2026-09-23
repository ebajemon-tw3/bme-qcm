"use client";

import * as React from "react";
import { useData } from "@/components/data-provider";
import { PageHeader, Section } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { dayTime, isoDay } from "@/lib/format";
import { clearHistory, exportHistory, importHistory, useHistory } from "@/lib/history";

export function SettingsView() {
  const { bundle, remembered, forgetPassword } = useData();
  const history = useHistory();
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [message, setMessage] = React.useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const total = Object.values(bundle.questions).reduce((n, qs) => n + qs.length, 0);

  function download() {
    const blob = new Blob([exportHistory()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bme-qcm-historique-${isoDay(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: `${history.sessions.length} sessions exportées.` });
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const { added, skipped } = importHistory(await file.text());
      setMessage({
        tone: "ok",
        text: `${added} sessions ajoutées${skipped ? `, ${skipped} déjà présentes ignorées` : ""}. Marques fusionnées.`,
      });
    } catch (error) {
      setMessage({
        tone: "bad",
        text: error instanceof SyntaxError ? "Ce fichier n'est pas du JSON." : (error as Error).message,
      });
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <PageHeader title="Réglages" />

      <Section title="Historique">
        <p className="text-sm text-muted-foreground">
          L&apos;historique vit dans ce navigateur : {history.sessions.length} sessions. Pour passer d&apos;un appareil à
          l&apos;autre, exporter ici puis importer sur l&apos;autre appareil. L&apos;import fusionne, il n&apos;efface rien.
          Le fichier contient des identifiants de questions et des réponses, pas de texte de cours.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="h-11" onClick={download}>
            Exporter en JSON
          </Button>
          <Button size="lg" variant="outline" className="h-11" onClick={() => fileInput.current?.click()}>
            Importer un JSON
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={upload}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" variant="destructive" className="h-11" disabled={!history.sessions.length}>
                Effacer l&apos;historique
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Effacer l&apos;historique de ce navigateur ?</AlertDialogTitle>
                <AlertDialogDescription>
                  {history.sessions.length} sessions et toutes les marques seront supprimées de cet appareil. Exporter
                  d&apos;abord pour les conserver.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    clearHistory();
                    setMessage({ tone: "ok", text: "Historique effacé." });
                  }}
                >
                  Effacer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p role="status" className={message?.tone === "bad" ? "text-sm text-bad" : "text-sm"}>
          {message?.text}
        </p>
      </Section>

      <Section title="Mot de passe">
        <p className="text-sm text-muted-foreground">
          {remembered
            ? "Le mot de passe est retenu sur cet appareil : le site se déverrouille à l'ouverture."
            : "Le mot de passe n'est pas retenu : il sera demandé à la prochaine ouverture."}
        </p>
        <Button size="lg" variant="outline" className="h-11 w-fit" onClick={forgetPassword}>
          {remembered ? "Oublier le mot de passe et verrouiller" : "Verrouiller"}
        </Button>
      </Section>

      <Section title="Données publiées">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Généré le</dt>
          <dd className="tabular-nums">{dayTime(bundle.generatedAt)}</dd>
          <dt className="text-muted-foreground">Matières</dt>
          <dd className="tabular-nums">{bundle.subjects.length}</dd>
          <dt className="text-muted-foreground">Questions</dt>
          <dd className="tabular-nums">{total}</dd>
          <dt className="text-muted-foreground">Échéances</dt>
          <dd className="tabular-nums">
            {bundle.deadlines.length} datées, {bundle.undated.length} non datées
          </dd>
        </dl>
      </Section>
    </div>
  );
}
