import { daysBetween, plural } from "@/lib/format";
import type { Stay } from "@/lib/types";

// Avancement du séjour, dates lues dans la section « Séjour » de calendrier.md.
export function StayProgress({ stay, today }: { stay: Stay | null | undefined; today: string }) {
  if (!stay) return null;
  const total = daysBetween(stay.start, stay.end) + 1;
  const elapsed = Math.min(Math.max(daysBetween(stay.start, today) + 1, 0), total);
  const left = total - elapsed;
  const pct = Math.round((elapsed / total) * 100);
  const status =
    elapsed === 0
      ? `Arrivée dans ${plural(daysBetween(today, stay.start), "jour")}`
      : left === 0
        ? "Séjour terminé"
        : `Jour ${elapsed} sur ${total}, ${plural(left, "jour restant", "jours restants")}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span>{status}</span>
        <span className="text-muted-foreground tabular-nums">{pct} %</span>
      </div>
      <div
        role="progressbar"
        aria-label="Avancement du séjour"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={elapsed}
        aria-valuetext={status}
        className="h-2 w-full bg-muted"
      >
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>Arrivée {stay.start}</span>
        <span>Départ {stay.end}</span>
      </div>
    </div>
  );
}
