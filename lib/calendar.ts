// Événements du calendrier : séances régulières tirées des créneaux, lignes datées des plannings
// de chaque matière et échéances de calendrier.md.
import type { Bundle, MdTable, Stay, Subject } from "@/lib/types";

export type EventKind = "normal" | "important" | "off";

export interface CalEvent {
  id: string;
  date: string;
  sigle: string;
  subjectTitle: string;
  text: string;
  type: string;
  room: string;
  // Minutes depuis minuit. null : événement sans heure, affiché en « journée entière ».
  start: number | null;
  end: number | null;
  // Fin non écrite dans les sources : la durée affichée est indicative, seule l'heure de début est sûre.
  openEnd?: boolean;
  kind: EventKind;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const OFF = /pas de (cours|séance)|annulé|férié/i;
const IMPORTANT = /évaluation|examen|rattrapage|rendu|deadline/i;
// Échéances qui s'ajoutent à la séance du jour sans la remplacer.
const KEEPS_SESSION = /rendu|deadline/i;
const RANGE = /(\d{1,2})h(\d{2})\s*à\s*(\d{1,2})h(\d{2})/;
const START = /(\d{1,2})h(\d{2})/;
const LENGTH = /(\d+)\s*min\b/;
// Durée affichée quand seule l'heure de début est connue.
const DEFAULT_LENGTH = 60;

export const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function utc(day: string) {
  return new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)));
}

export function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number) {
  const d = utc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

export function addMonths(day: string, n: number) {
  const d = utc(day);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

export function weekday(day: string) {
  return WEEKDAYS[utc(day).getUTCDay()];
}

export function monday(day: string) {
  return addDays(day, -((utc(day).getUTCDay() + 6) % 7));
}

export function formatDay(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(utc(day));
}

export function hhmm(minutes: number) {
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

function column(table: MdTable, pattern: RegExp) {
  return table.headers.findIndex((h) => pattern.test(h));
}

// Créneau de la matière pour ce jour de la semaine, lu dans « Créneau et salle ».
function slot(subject: Subject | undefined, day: string) {
  const table = subject?.schedule;
  if (!table) return { hours: "", room: "" };
  const [jour, horaire, salle] = [/^jour$/i, /^horaire$/i, /^salle$/i].map((p) => column(table, p));
  const row = jour === -1 ? undefined : table.rows.find((r) => r[jour]?.toLowerCase() === weekday(day));
  return { hours: row?.[horaire] ?? "", room: row?.[salle] ?? "" };
}

function times(...sources: string[]) {
  for (const s of sources) {
    const range = RANGE.exec(s);
    if (range) return { start: +range[1] * 60 + +range[2], end: +range[3] * 60 + +range[4], openEnd: false };
  }
  for (const s of sources) {
    const start = START.exec(s);
    if (start) {
      const from = +start[1] * 60 + +start[2];
      const length = LENGTH.exec(s);
      return { start: from, end: from + (length ? +length[1] : DEFAULT_LENGTH), openEnd: !length };
    }
  }
  return { start: null, end: null, openEnd: false };
}

export function timeLabel(e: CalEvent) {
  if (e.start === null) return "";
  return e.openEnd ? `à partir de ${hhmm(e.start)}` : `${hhmm(e.start)} à ${hhmm(e.end!)}`;
}

// Séances régulières générées depuis « Créneau et salle » sur la période d'enseignement. La colonne
// Semaines vaut « 1 à 14 », « paires » ou « impaires », comptées depuis la semaine du début.
export function recurringSlots(subject: Subject, semester: Stay | null | undefined) {
  const table = subject.schedule;
  if (!table || !semester) return [];
  const [type, jour, horaire, salle, semaines] = [/^type$/i, /^jour$/i, /^horaire$/i, /^salle$/i, /^semaines$/i].map(
    (p) => column(table, p),
  );
  if (jour === -1 || horaire === -1) return [];
  const base = monday(semester.start);
  return table.rows.flatMap((row) => {
    const day = WEEKDAYS.indexOf(row[jour]?.toLowerCase() ?? "");
    if (day === -1 || !RANGE.test(row[horaire] ?? "")) return [];
    const weeks = semaines === -1 ? "" : (row[semaines] ?? "");
    const parity = /impaires/i.test(weeks) ? 1 : /paires/i.test(weeks) ? 0 : null;
    const out: { date: string; label: string; hours: string; room: string }[] = [];
    for (let n = 1; ; n++) {
      const date = addDays(base, (n - 1) * 7 + ((day + 6) % 7));
      if (date > semester.end) break;
      if (date < semester.start || (parity !== null && n % 2 !== parity)) continue;
      out.push({
        date,
        label: type === -1 ? "Cours" : row[type],
        hours: row[horaire],
        room: salle === -1 ? "" : (row[salle] ?? ""),
      });
    }
    return out;
  });
}

export function datedRows(subject: Subject) {
  const table = subject.planning;
  if (!table) return [];
  const dateCol = column(table, /^date/i);
  const labelCol = column(table, /^(séance|contenu)$/i);
  if (dateCol === -1 || labelCol === -1) return [];
  return table.rows.filter((r) => ISO_DAY.test(r[dateCol] ?? "")).map((r) => ({ date: r[dateCol], text: r[labelCol] }));
}

// Priorité, du plus précis au plus général : échéance de calendrier.md, ligne datée du planning,
// séance générée depuis le créneau. Une échéance ne remplace la séance du jour que si elle n'a pas
// d'heure propre ou si son heure chevauche le créneau (un midterm du soir laisse le cours du matin),
// et jamais s'il s'agit d'un rendu.
// L'horaire du créneau n'est appliqué qu'aux séances et aux annulations : une évaluation sans heure
// écrite reste en journée entière plutôt que de recevoir un horaire supposé.
export function buildEvents(bundle: Bundle): CalEvent[] {
  const byCode = new Map(bundle.subjects.map((s) => [s.code, s]));
  const replaces = (code: string, date: string, slotHours: string) => {
    const session = times(slotHours);
    return bundle.deadlines.some((d) => {
      if (d.date !== date || d.codes.length !== 1 || d.codes[0] !== code || KEEPS_SESSION.test(d.type)) return false;
      const own = times(d.event);
      return own.start === null || session.start === null || (own.start < session.end! && own.end! > session.start);
    });
  };

  const sessions: CalEvent[] = bundle.subjects.flatMap((s) =>
    datedRows(s)
      .filter((r) => !replaces(s.code, r.date, slot(s, r.date).hours))
      .map((r, i) => {
        const { hours, room } = slot(s, r.date);
        const off = OFF.test(r.text);
        return {
          id: `p-${s.code}-${r.date}-${i}`,
          date: r.date,
          sigle: s.sigle ?? s.code,
          subjectTitle: s.title,
          text: r.text,
          type: off ? "Pas de cours" : "Séance",
          room,
          ...times(hours),
          kind: off ? "off" : "normal",
        };
      }),
  );

  const deadlines: CalEvent[] = bundle.deadlines.map((d, i) => {
    const subject = d.codes.length === 1 ? byCode.get(d.codes[0]) : undefined;
    const off = OFF.test(d.type) || OFF.test(d.event);
    const session = /séance|fait/i.test(d.type);
    const { hours, room } = slot(subject, d.date);
    const own = times(d.event);
    return {
      id: `d-${d.date}-${i}`,
      date: d.date,
      sigle: subject?.sigle ?? d.subjectLabel,
      subjectTitle: subject?.title ?? "Toutes les matières",
      text: d.event,
      type: d.type,
      room: off || session ? room : "",
      ...(own.start === null && (off || session) ? times(hours) : own),
      kind: off ? "off" : IMPORTANT.test(d.type) ? "important" : "normal",
    };
  });

  const planned = new Set(sessions.map((e) => `${e.date}|${e.sigle}`));
  const regular: CalEvent[] = bundle.subjects.flatMap((s) =>
    recurringSlots(s, bundle.semester)
      .filter((r) => !planned.has(`${r.date}|${s.sigle ?? s.code}`) && !replaces(s.code, r.date, r.hours))
      .map((r) => ({
        id: `r-${s.code}-${r.date}-${r.hours}`,
        date: r.date,
        sigle: s.sigle ?? s.code,
        subjectTitle: s.title,
        text: r.label,
        type: "Séance",
        room: r.room,
        ...times(r.hours),
        kind: "normal" as const,
      })),
  );

  return [...regular, ...sessions, ...deadlines].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1),
  );
}

// Répartition en colonnes des événements qui se chevauchent dans une même journée.
export function layoutDay(events: CalEvent[]) {
  const timed = events.filter((e) => e.start !== null).sort((a, b) => a.start! - b.start! || b.end! - a.end!);
  const placed: { event: CalEvent; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };
  for (const event of timed) {
    if (event.start! >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= event.start!);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = event.end!;
    const p = { event, lane, lanes: 1 };
    cluster.push(p);
    placed.push(p);
    clusterEnd = Math.max(clusterEnd, event.end!);
  }
  flush();
  return placed;
}
