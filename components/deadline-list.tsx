import { MdInline } from "@/components/md-inline";
import { daysBetween, inDays } from "@/lib/format";
import type { Deadline, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

// Échéances datées issues de calendrier.md. Moins de 3 jours : date en ambre.
export function DeadlineList({
  deadlines,
  today,
  subjects,
  showSubject = true,
}: {
  deadlines: Deadline[];
  today: string;
  subjects: Subject[];
  showSubject?: boolean;
}) {
  if (deadlines.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune échéance datée sur la période.</p>;
  }
  const sigle = (d: Deadline) =>
    d.codes.length === 1 ? subjects.find((s) => s.code === d.codes[0])?.sigle ?? d.subjectLabel : d.subjectLabel;
  return (
    <ul className="flex flex-col divide-y border-y">
      {deadlines.map((d, i) => {
        const days = daysBetween(today, d.date);
        return (
          <li key={i} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
            <div className="flex shrink-0 gap-2 text-sm tabular-nums sm:w-56 sm:flex-col sm:gap-0">
              <time dateTime={d.date} className={cn(days <= 3 && "text-warn")}>
                {d.date} {d.weekday}
              </time>
              <span className="text-muted-foreground">{inDays(days)}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span>
                {showSubject ? <span className="mr-2 text-muted-foreground">{sigle(d)}</span> : null}
                <MdInline text={d.event} />
              </span>
              <span className="text-xs text-muted-foreground">{d.type}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function upcoming(deadlines: Deadline[], today: string, withinDays?: number) {
  return deadlines.filter((d) => {
    const days = daysBetween(today, d.date);
    return days >= 0 && (withinDays === undefined || days <= withinDays);
  });
}
