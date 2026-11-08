"use client";

import Link from "next/link";
import { Snowflake } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { ScheduleEventCard } from "@/components/schedule/schedule-event-card";
import type { ScheduleView } from "@/components/schedule/schedule-filters";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WEEKDAY_LABEL } from "@/lib/constants";
import { hasSensors } from "@/lib/room-utils";
import {
  WEEKDAYS,
  getAIPlan,
  getEventStatus,
  minutesToTime,
  toMinutes,
  type ScheduleCtx,
} from "@/lib/schedule-utils";
import { cn } from "@/lib/utils";
import type { Room, ScheduleEvent, Weekday } from "@/types";

// ───────── Visão semanal: sala × dia da semana ─────────
function WeekGrid({
  events,
  rooms,
  ctx,
  onEdit,
}: {
  events: ScheduleEvent[];
  rooms: Room[];
  ctx: ScheduleCtx;
  onEdit?: (event: ScheduleEvent) => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-28 bg-card">Sala</TableHead>
            {WEEKDAYS.map((day) => (
              <TableHead key={day}>
                <span className="inline-flex items-center gap-2">
                  {WEEKDAY_LABEL[day]}
                  {day === ctx.clock.weekday && (
                    <Badge variant="secondary" className="text-[10px]">
                      hoje
                    </Badge>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="sticky left-0 z-10 bg-card align-top">
                <Link href={`/salas/${room.id}`} className="block text-sm font-medium hover:underline">
                  {room.name}
                </Link>
                <span className="text-[11px] text-muted-foreground">{room.block}</span>
              </TableCell>
              {WEEKDAYS.map((day) => {
                const cell = events
                  .filter((e) => e.roomId === room.id && e.weekday === day)
                  .sort((a, b) => a.start.localeCompare(b.start));
                return (
                  <TableCell key={day} className="whitespace-normal align-top">
                    {cell.length === 0 ? (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    ) : (
                      <div className="flex min-w-[120px] flex-col gap-1">
                        {cell.map((event) => (
                          <ScheduleEventCard key={event.id} event={event} variant="compact" onEdit={onEdit} />
                        ))}
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ───────── Visão do dia: linha do tempo por sala ─────────
const TIMELINE_START = 5 * 60;
const TIMELINE_END = 24 * 60;
const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;
const HOURS = Array.from({ length: (TIMELINE_END - TIMELINE_START) / 60 + 1 }, (_, i) => TIMELINE_START / 60 + i);

const pct = (minutes: number) =>
  Math.min(100, Math.max(0, ((minutes - TIMELINE_START) / TIMELINE_RANGE) * 100));

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm border", className)} aria-hidden />
      {label}
    </span>
  );
}

function DayTimeline({
  events,
  rooms,
  day,
  ctx,
}: {
  events: ScheduleEvent[];
  rooms: Room[];
  day: Weekday;
  ctx: ScheduleCtx;
}) {
  const dayEvents = events.filter((e) => e.weekday === day);
  const nowMinutes = ctx.clock.minutes;
  const isToday = day === ctx.clock.weekday;
  const showNow = isToday && nowMinutes >= TIMELINE_START && nowMinutes <= TIMELINE_END;
  const nowLeft = `${pct(nowMinutes)}%`;

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="min-w-[960px]">
        {/* Régua de horas */}
        <div className="flex border-b">
          <div className="sticky left-0 z-10 w-28 shrink-0 border-r bg-card" />
          <div className="relative h-10 flex-1">
            {HOURS.slice(0, -1).map((hour) => (
              <span
                key={hour}
                className="absolute top-0.5 -translate-x-1/2 text-[10px] text-muted-foreground"
                style={{ left: `${pct(hour * 60)}%` }}
              >
                {String(hour).padStart(2, "0")}h
              </span>
            ))}
            {showNow && (
              <span
                className="absolute bottom-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-danger px-1 text-[10px] font-medium text-danger-foreground"
                style={{ left: nowLeft }}
              >
                Agora {minutesToTime(nowMinutes)}
              </span>
            )}
          </div>
        </div>

        {/* Uma linha por sala */}
        {rooms.map((room) => {
          const roomEvents = dayEvents
            .filter((e) => e.roomId === room.id)
            .sort((a, b) => a.start.localeCompare(b.start));

          return (
            <div key={room.id} className="flex border-b last:border-b-0">
              <div className="sticky left-0 z-10 flex w-28 shrink-0 flex-col justify-center border-r bg-card px-3 py-2">
                <Link href={`/salas/${room.id}`} className="text-sm font-medium hover:underline">
                  {room.name}
                </Link>
                <span className="text-[11px] text-muted-foreground">{room.block}</span>
              </div>

              <div className="relative h-14 flex-1">
                {HOURS.slice(1, -1).map((hour) => (
                  <span
                    key={hour}
                    className="absolute inset-y-0 w-px bg-border/60"
                    style={{ left: `${pct(hour * 60)}%` }}
                    aria-hidden
                  />
                ))}

                {roomEvents.length === 0 && (
                  <span className="absolute inset-0 flex items-center pl-3 text-xs text-muted-foreground">
                    Sem aula neste dia{hasSensors(room) ? " · equipamentos desligados" : ""}
                  </span>
                )}

                {roomEvents.map((event) => {
                  const plan = getAIPlan(event, ctx);
                  const start = toMinutes(event.start);
                  const end = toMinutes(event.end);
                  const status = getEventStatus(event, ctx);
                  const preStart =
                    plan.kind === "pre_cool" && !room.hasIssue
                      ? Math.max(start - plan.minutes, TIMELINE_START)
                      : null;

                  return (
                    <div key={event.id}>
                      {preStart !== null && plan.kind === "pre_cool" && (
                        <div
                          title={`A IA liga o ar às ${plan.at}`}
                          className="absolute inset-y-2 flex items-center justify-center rounded-md border border-dashed border-info/50 bg-info/15 text-info"
                          style={{ left: `${pct(preStart)}%`, width: `${pct(start) - pct(preStart)}%` }}
                        >
                          <Snowflake className="size-3" aria-hidden />
                        </div>
                      )}
                      <div
                        title={`${event.course} · ${event.teacher} · ${event.start}–${event.end}`}
                        className={cn(
                          "absolute inset-y-2 overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight",
                          room.hasIssue
                            ? "border-danger/40 bg-danger/15"
                            : status === "ongoing"
                              ? "border-success/40 bg-success/15"
                              : "border-primary/40 bg-primary/15",
                        )}
                        style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
                      >
                        <span className="block truncate font-medium">{event.course}</span>
                        <span className="block truncate tabular-nums text-muted-foreground">
                          {event.start}–{event.end}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {showNow && (
                  <span
                    className="absolute inset-y-0 w-0.5 bg-danger/70"
                    style={{ left: nowLeft }}
                    aria-hidden
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
          <LegendItem className="border-primary/40 bg-primary/15" label="Aula" />
          {isToday && <LegendItem className="border-success/40 bg-success/15" label="Aula em andamento" />}
          <LegendItem className="border-dashed border-info/50 bg-info/15" label="IA liga o ar (pré-resfriamento)" />
          <LegendItem className="border-danger/40 bg-danger/15" label="Sala com falha" />
          {showNow && <LegendItem className="border-danger/70 bg-danger/70" label="Agora" />}
        </div>
      </div>
    </div>
  );
}

interface ScheduleGridProps {
  events: ScheduleEvent[];
  rooms: Room[];
  view: ScheduleView;
  day: Weekday;
  /** Se informado, clicar numa aula da visão semanal abre a edição. */
  onEdit?: (event: ScheduleEvent) => void;
}

export function ScheduleGrid({ events, rooms, view, day, onEdit }: ScheduleGridProps) {
  const { scheduleCtx } = useAppData();

  return view === "week" ? (
    <WeekGrid events={events} rooms={rooms} ctx={scheduleCtx} onEdit={onEdit} />
  ) : (
    <DayTimeline events={events} rooms={rooms} day={day} ctx={scheduleCtx} />
  );
}