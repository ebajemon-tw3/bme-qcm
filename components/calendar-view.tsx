"use client";

import * as React from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useData } from "@/components/data-provider";
import { MdInline } from "@/components/md-inline";
import { Section } from "@/components/page-header";
import { StayProgress } from "@/components/stay-progress";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  addDays,
  addMonths,
  buildEvents,
  type CalEvent,
  datedRows,
  formatDay,
  hhmm,
  layoutDay,
  monday,
  recurringSlots,
} from "@/lib/calendar";
import { isoDay } from "@/lib/format";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "jour" | "semaine" | "mois";

const HOUR_PX = 48;
const FIRST_HOUR = 8;
const LAST_HOUR = 20;
const MONTH_CHIPS = 3;

const KIND_CLASS: Record<CalEvent["kind"], string> = {
  normal: "border-l-2 border-foreground/50 bg-secondary",
  important: "border-l-2 border-warn bg-warn/15",
  off: "border border-dashed border-border text-muted-foreground",
};

function useNow() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function title(view: View, cursor: string) {
  if (view === "jour") return formatDay(cursor, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "mois") return formatDay(cursor, { month: "long", year: "numeric" });
  const start = monday(cursor);
  const end = addDays(start, 6);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${formatDay(start, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })} au ${formatDay(end, { day: "numeric", month: "long", year: "numeric" })}`;
}

function EventButton({
  event,
  onSelect,
  className,
  style,
  showTime = false,
}: {
  event: CalEvent;
  onSelect: (e: CalEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  showTime?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      style={style}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden px-1.5 py-0.5 text-left text-xs leading-snug hover:brightness-125 focus-visible:outline-1",
        KIND_CLASS[event.kind],
        className,
      )}
    >
      <span className="truncate font-semibold">{event.sigle}</span>
      <span className="line-clamp-3 break-words">
        <MdInline text={event.text} />
      </span>
      {showTime && event.start !== null ? (
        <span className="text-muted-foreground tabular-nums">
          {hhmm(event.start)} à {hhmm(event.end!)}
          {event.room ? `, ${event.room}` : ""}
        </span>
      ) : null}
    </button>
  );
}

function TimeGrid({
  days,
  events,
  today,
  now,
  onSelect,
  onPickDay,
}: {
  days: string[];
  events: CalEvent[];
  today: string;
  now: Date;
  onSelect: (e: CalEvent) => void;
  onPickDay: (day: string) => void;
}) {
  const timed = events.filter((e) => e.start !== null);
  const first = Math.min(FIRST_HOUR, ...timed.map((e) => Math.floor(e.start! / 60)));
  const last = Math.max(LAST_HOUR, ...timed.map((e) => Math.ceil(e.end! / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const single = days.length === 1;
  const cols = { gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="overflow-x-auto border-y">
      <div className={cn(!single && "min-w-[44rem]")}>
        <div className="grid border-b" style={cols}>
          <div />
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => onPickDay(day)}
              className="flex items-baseline justify-center gap-1.5 border-l py-2 text-sm hover:bg-accent"
            >
              <span className="text-muted-foreground">{formatDay(day, { weekday: "short" })}</span>
              <span
                className={cn(
                  "inline-flex min-w-7 justify-center px-1 tabular-nums",
                  day === today && "bg-foreground font-semibold text-background",
                )}
              >
                {formatDay(day, { day: "numeric" })}
              </span>
            </button>
          ))}
        </div>

        <div className="grid border-b" style={cols}>
          <div className="px-1 py-1 text-right text-[0.65rem] leading-tight text-muted-foreground">journée</div>
          {days.map((day) => (
            <div key={day} className="flex min-h-8 min-w-0 flex-col gap-1 border-l p-1">
              {events
                .filter((e) => e.date === day && e.start === null)
                .map((e) => (
                  <EventButton key={e.id} event={e} onSelect={onSelect} />
                ))}
            </div>
          ))}
        </div>

        <div className="relative grid" style={cols}>
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="relative">
                <span className="absolute -top-2 right-1 text-[0.65rem] text-muted-foreground tabular-nums">
                  {h === first ? "" : `${h}h`}
                </span>
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day} className="relative border-l">
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="border-t first:border-t-0" />
              ))}
              {layoutDay(events.filter((e) => e.date === day)).map(({ event, lane, lanes }) => (
                <EventButton
                  key={event.id}
                  event={event}
                  onSelect={onSelect}
                  showTime={single}
                  className="absolute"
                  style={{
                    top: ((event.start! - first * 60) / 60) * HOUR_PX,
                    height: Math.max(((event.end! - event.start!) / 60) * HOUR_PX - 2, 18),
                    left: `calc(${(lane / lanes) * 100}% + 2px)`,
                    width: `calc(${100 / lanes}% - 4px)`,
                  }}
                />
              ))}
              {day === today && nowMin >= first * 60 && nowMin <= last * 60 ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-bad"
                  style={{ top: ((nowMin - first * 60) / 60) * HOUR_PX }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  cursor,
  events,
  today,
  stay,
  onSelect,
  onPickDay,
}: {
  cursor: string;
  events: CalEvent[];
  today: string;
  stay: Stay | null | undefined;
  onSelect: (e: CalEvent) => void;
  onPickDay: (day: string) => void;
}) {
  const month = cursor.slice(0, 7);
  const start = monday(`${month}-01`);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = days[35].slice(0, 7) === month ? 6 : 5;
  const visible = days.slice(0, weeks * 7);

  return (
    <div className="border-t border-l">
      <div className="grid grid-cols-7">
        {visible.slice(0, 7).map((d) => (
          <div key={d} className="border-r border-b px-1.5 py-1 text-xs text-muted-foreground">
            {formatDay(d, { weekday: "short" })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {visible.map((day) => {
          const items = events.filter((e) => e.date === day);
          const outside = day.slice(0, 7) !== month;
          const offStay = stay && (day < stay.start || day > stay.end);
          return (
            <div
              key={day}
              className={cn(
                "flex min-h-20 min-w-0 flex-col gap-0.5 border-r border-b p-1 sm:min-h-28",
                (outside || offStay) && "bg-muted/60",
              )}
            >
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className={cn(
                  "self-end px-1 text-xs tabular-nums hover:underline",
                  outside && "text-muted-foreground",
                  day === today && "bg-foreground font-semibold text-background",
                )}
              >
                {formatDay(day, { day: "numeric" })}
              </button>
              {items.slice(0, MONTH_CHIPS).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelect(e)}
                  className={cn("truncate px-0.5 text-left text-[0.6rem] leading-5 sm:px-1 sm:text-[0.7rem]", KIND_CLASS[e.kind])}
                >
                  {e.start !== null ? <span className="mr-1 hidden tabular-nums opacity-70 sm:inline">{hhmm(e.start)}</span> : null}
                  {e.sigle}
                </button>
              ))}
              {items.length > MONTH_CHIPS ? (
                <button
                  type="button"
                  onClick={() => onPickDay(day)}
                  className="px-1 text-left text-[0.7rem] text-muted-foreground hover:underline"
                >
                  {items.length - MONTH_CHIPS} de plus
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarView() {
  const { bundle } = useData();
  const now = useNow();
  const today = isoDay(now);
  const events = React.useMemo(() => buildEvents(bundle), [bundle]);
  // Rendu uniquement côté client, après déverrouillage du bundle : window est disponible.
  const [view, setView] = React.useState<View>(() =>
    window.matchMedia("(max-width: 639px)").matches ? "jour" : "semaine",
  );
  const [cursor, setCursor] = React.useState(today);
  const [selected, setSelected] = React.useState<CalEvent | null>(null);

  const step = (n: number) =>
    setCursor((c) => (view === "mois" ? addMonths(c, n) : addDays(c, view === "semaine" ? 7 * n : n)));
  const pickDay = (day: string) => {
    setCursor(day);
    setView("jour");
  };
  const days = view === "jour" ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(monday(cursor), i));
  const undated = bundle.subjects.filter(
    (s) => datedRows(s).length === 0 && recurringSlots(s, bundle.semester).length === 0,
  );

  return (
    <>
      <header className="mb-6 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Calendrier des cours</h1>
        <StayProgress stay={bundle.stay} today={today} />
      </header>

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label="Période précédente">
                <CaretLeftIcon />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(today)}>
                Aujourd&apos;hui
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label="Période suivante">
                <CaretRightIcon />
              </Button>
              <h2 className="ml-2 text-sm font-semibold first-letter:uppercase" aria-live="polite">
                {title(view, cursor)}
              </h2>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={view}
              onValueChange={(v) => v && setView(v as View)}
              aria-label="Affichage"
            >
              <ToggleGroupItem value="jour">Jour</ToggleGroupItem>
              <ToggleGroupItem value="semaine">Semaine</ToggleGroupItem>
              <ToggleGroupItem value="mois">Mois</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {view === "mois" ? (
            <MonthGrid
              cursor={cursor}
              events={events}
              today={today}
              stay={bundle.stay}
              onSelect={setSelected}
              onPickDay={pickDay}
            />
          ) : (
            <TimeGrid
              days={days}
              events={events}
              today={today}
              now={now}
              onSelect={setSelected}
              onPickDay={pickDay}
            />
          )}

          <p className="text-xs text-muted-foreground">
            Bordure ambre : évaluation, examen, rattrapage ou rendu. Pointillés : pas de cours. Sans heure écrite
            dans les fiches, un événement reste en « journée ».
          </p>
        </div>

        {undated.length ? (
          <Section title="Matières sans planning daté">
            <ul className="flex flex-col divide-y border-y">
              {undated.map((s) => (
                <li key={s.code} className="flex gap-2 py-3 text-sm">
                  <span className="w-[9ch] shrink-0 text-muted-foreground">{s.sigle ?? s.code}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span>{s.title}</span>
                    {(s.schedule?.rows ?? []).map((r, i) => (
                      <span key={i} className="text-xs text-muted-foreground">
                        <MdInline text={r.filter(Boolean).join(", ")} />
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="gap-0 p-0">
          {selected ? (
            <>
              <SheetHeader className="border-b p-4 pr-12">
                <SheetTitle className="text-sm">
                  {selected.sigle}, {selected.subjectTitle}
                </SheetTitle>
                <SheetDescription className="first-letter:uppercase">
                  {formatDay(selected.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {selected.start !== null ? `, ${hhmm(selected.start)} à ${hhmm(selected.end!)}` : ""}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 p-4 text-sm">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{selected.type}</dd>
                {selected.room ? (
                  <>
                    <dt className="text-muted-foreground">Salle</dt>
                    <dd>
                      <MdInline text={selected.room} />
                    </dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">Détail</dt>
                <dd className="break-words">
                  <MdInline text={selected.text} />
                </dd>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
