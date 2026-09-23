const number1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function percent(value: number | null) {
  return value === null ? "-" : `${Math.round(value * 100)} %`;
}

export function seconds(ms: number) {
  return `${number1.format(ms / 1000)} s`;
}

export function duration(ms: number) {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total} s`;
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min < 60) return sec ? `${min} min ${String(sec).padStart(2, "0")}` : `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

// Date locale au format YYYY-MM-DD, comme dans le dépôt cours.
export function isoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayTime(iso: string) {
  const date = new Date(iso);
  return `${isoDay(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function daysBetween(fromDay: string, toDay: string) {
  const [a, b] = [fromDay, toDay].map((d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

export function inDays(days: number) {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} j`;
}

export function chapterRange(chapters: number[]) {
  if (chapters.length === 0) return "";
  const sorted = [...chapters].sort((a, b) => a - b);
  const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
  if (sorted.length === 1) return `ch. ${sorted[0]}`;
  if (contiguous) return `ch. ${sorted[0]} à ${sorted[sorted.length - 1]}`;
  return `ch. ${sorted.join(", ")}`;
}
