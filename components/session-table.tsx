import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chapterRange, dayTime, duration, percent, seconds } from "@/lib/format";
import type { SessionRecord } from "@/lib/history";
import { MODE_LABEL } from "@/lib/quiz";
import { sessionScore } from "@/lib/stats";
import type { Subject } from "@/lib/types";

export function sessionChapters(session: SessionRecord) {
  return [...new Set(session.answers.map((a) => a.chapter))];
}

// Sessions, de la plus récente à la plus ancienne. Sur téléphone, les colonnes secondaires
// sont masquées : la revue de la session les affiche toutes.
export function SessionTable({
  sessions,
  subjects,
  showSubject = true,
}: {
  sessions: SessionRecord[];
  subjects: Subject[];
  showSubject?: boolean;
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune session enregistrée.</p>;
  }
  const rows = [...sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const sigle = (code: string) => subjects.find((s) => s.code === code)?.sigle ?? code;
  return (
    <Table>
      <caption className="sr-only">Sessions de QCM</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {showSubject ? <TableHead>Matière</TableHead> : null}
          <TableHead>Périmètre</TableHead>
          <TableHead className="hidden md:table-cell">Mode</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Durée</TableHead>
          <TableHead className="hidden text-right md:table-cell">Par question</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => {
          const correct = s.answers.filter((a) => a.correct).length;
          return (
            <TableRow key={s.id}>
              <TableCell className="tabular-nums">
                <Link href={`/session?id=${s.id}`} className="underline underline-offset-4 hover:text-muted-foreground">
                  {dayTime(s.endedAt)}
                </Link>
              </TableCell>
              {showSubject ? <TableCell>{sigle(s.subject)}</TableCell> : null}
              <TableCell className="whitespace-normal">
                {s.scope.label}
                <span className="block text-xs text-muted-foreground">{chapterRange(sessionChapters(s))}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell">{MODE_LABEL[s.mode]}</TableCell>
              <TableCell className="text-right tabular-nums">
                {correct}/{s.answers.length}
                <span className="block text-xs text-muted-foreground">{percent(sessionScore(s))}</span>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">{duration(s.durationMs)}</TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {s.answers.length ? seconds(s.durationMs / s.answers.length) : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
