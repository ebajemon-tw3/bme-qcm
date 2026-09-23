import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dayTime, duration, percent, seconds } from "@/lib/format";
import type { SessionRecord } from "@/lib/history";
import { MODE_LABEL } from "@/lib/quiz";
import { groupAnswers, sessionScore, successRate, tally } from "@/lib/stats";
import type { Subject } from "@/lib/types";

export function SessionSummary({ session, subject }: { session: SessionRecord; subject?: Subject }) {
  const correct = session.answers.filter((a) => a.correct).length;
  const n = session.answers.length;
  const rows: [string, string][] = [
    ["Score", `${correct}/${n}, ${percent(sessionScore(session))}`],
    ["Matière", subject ? `${subject.sigle ?? subject.code}, ${subject.title}` : session.subject],
    ["Périmètre", session.scope.label],
    ["Mode", MODE_LABEL[session.mode]],
    ["Date", dayTime(session.endedAt)],
    ["Durée", duration(session.durationMs)],
    ["Temps moyen par question", n ? seconds(session.durationMs / n) : "-"],
  ];
  const chapters = [...groupAnswers(session.answers, "chapter")].sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <Table>
        <caption className="sr-only">Résultat par chapitre</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Chapitre</TableHead>
            <TableHead className="text-right">Justes</TableHead>
            <TableHead className="text-right">Taux</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chapters.map(([chapter, answers]) => {
            const t = tally(answers);
            return (
              <TableRow key={chapter}>
                <TableCell className="whitespace-normal">
                  {chapter}
                  {subject?.chapterTitles[Number(chapter)] ? (
                    <span className="ml-2 text-muted-foreground">{subject.chapterTitles[Number(chapter)]}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.correct}/{t.attempts}
                </TableCell>
                <TableCell className="text-right tabular-nums">{percent(successRate(t))}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
