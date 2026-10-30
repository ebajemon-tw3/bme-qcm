import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PROGRESS_STATES, type ProgressState, type Subject, type SubjectProgress } from "@/lib/types";

// Seuil de validation de la mobilité fixé par l'ECE.
const ECE_THRESHOLD = 30;

const SWATCH: Record<ProgressState, string> = {
  Validé: "bg-ok",
  "En bonne voie": "bg-foreground",
  "En cours": "bg-chart-3",
  "En attente de note": "bg-muted-foreground",
  "À surveiller": "bg-warn",
};

// Crédits inscrits répartis par état, du plus sûr au moins sûr, avec le seuil ECE.
export function SubjectProgressView({ progress, subjects }: { progress: SubjectProgress[]; subjects: Subject[] }) {
  const rows = progress
    .map((p) => ({ ...p, subject: subjects.find((s) => s.code === p.code) }))
    .filter((r): r is typeof r & { subject: Subject } => Boolean(r.subject))
    .sort((a, b) => PROGRESS_STATES.indexOf(a.state) - PROGRESS_STATES.indexOf(b.state));
  const ects = (r: (typeof rows)[number]) => r.subject.credits ?? 0;
  const total = rows.reduce((n, r) => n + ects(r), 0);
  if (!total) return null;

  const byState = PROGRESS_STATES.map((state) => ({
    state,
    credits: rows.filter((r) => r.state === state).reduce((n, r) => n + ects(r), 0),
  })).filter((x) => x.credits > 0);
  const margin = total - ECE_THRESHOLD;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {total} ECTS inscrits, seuil ECE {ECE_THRESHOLD}, marge {margin} ECTS.
      </p>

      <div className="relative pt-5">
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${(ECE_THRESHOLD / total) * 100}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-xs text-muted-foreground tabular-nums">seuil {ECE_THRESHOLD}</span>
          <span className="w-px flex-1 bg-foreground" />
        </div>
        <div role="img" aria-label="Répartition des crédits par état" className="flex h-8 gap-0.5">
          {rows.map((r) => (
            <Tooltip key={r.code}>
              <TooltipTrigger asChild>
                <div
                  className={`${SWATCH[r.state]} flex min-w-0 items-center justify-center first:rounded-l-sm last:rounded-r-sm`}
                  style={{ flexGrow: ects(r), flexBasis: 0 }}
                >
                  <span
                    className={`truncate px-0.5 text-[10px] font-semibold ${r.state === "En cours" ? "text-foreground" : "text-background"}`}
                  >
                    {r.subject.sigle ?? r.code}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {r.subject.sigle ?? r.code}, {ects(r)} ECTS : {r.state}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {byState.map((x) => (
          <li key={x.state} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${SWATCH[x.state]}`} />
            {x.state}
            <span className="text-muted-foreground tabular-nums">{x.credits} ECTS</span>
          </li>
        ))}
      </ul>

      <ul className="divide-y border-y">
        {rows.map((r) => (
          <li key={r.code} className="flex flex-col gap-1 py-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <Link href={`/matiere?c=${r.code}`} className="min-w-0 truncate underline-offset-4 hover:underline">
                <span className="mr-2 font-semibold">{r.subject.sigle ?? r.code}</span>
                <span className="text-muted-foreground">{r.subject.title}</span>
              </Link>
              <span className="flex shrink-0 items-center gap-1.5 text-xs">
                <span className={`size-2.5 rounded-sm ${SWATCH[r.state]}`} />
                {r.state}
                <span className="text-muted-foreground tabular-nums">{ects(r)} ECTS</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground">Fait :</span> {r.done}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground">Reste :</span> {r.left}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
