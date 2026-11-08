import { MOCK_NOW, rooms as mockRooms } from "@/data/rooms";
import { scheduleEvents as mockEvents } from "@/data/schedule";
import { WEEKDAY_LABEL } from "@/lib/constants";
import type { Room, ScheduleEvent, Weekday } from "@/types";

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6];

/** Sexta-feira (MOCK_NOW = 06/11/2026) */
export const MOCK_WEEKDAY: Weekday = 5;

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const m = String(wrapped % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export const NOW_MINUTES = toMinutes(MOCK_NOW.slice(11, 16));

// ───────── Relógio e contexto ─────────
export interface ClockState {
  /** null = domingo (não há aulas). */
  weekday: Weekday | null;
  minutes: number; // minutos desde 00:00
}

export interface ScheduleCtx {
  events: ScheduleEvent[];
  rooms: Room[];
  clock: ClockState;
}

/** Contexto do protótipo: dados simulados com o relógio fixo na sexta, 18:40. */
export const MOCK_CTX: ScheduleCtx = {
  events: mockEvents,
  rooms: mockRooms,
  clock: { weekday: MOCK_WEEKDAY, minutes: NOW_MINUTES },
};

export function realClock(date: Date): ClockState {
  const dow = date.getDay(); // 0 = domingo, 1 = segunda ... 6 = sábado
  return {
    weekday: dow === 0 ? null : (dow as Weekday),
    minutes: date.getHours() * 60 + date.getMinutes(),
  };
}

// ───────── Pré-resfriamento (coerente com data/decisions.ts) ─────────
const PRE_COOL_BY_ROOM: Record<string, number> = {
  "A-101": 40,
  "A-102": 35,
  "B-101": 40,
  "C-101": 35,
  "C-102": 45,
  "C-201": 35,
};

/** Estimativa pela capacidade. As salas do protótipo têm valores medidos (`useKnown`). */
export function getPreCoolMinutes(roomId: string, capacity = 40, useKnown = true): number {
  const known = useKnown ? PRE_COOL_BY_ROOM[roomId] : undefined;
  if (known) return known;
  return capacity >= 45 ? 45 : capacity >= 40 ? 40 : 35;
}

/** Abaixo desse intervalo entre aulas, manter o ar ligado compensa mais. */
export const KEEP_ON_GAP_MIN = 90;

export type AIPlan =
  | { kind: "pre_cool"; at: string; minutes: number }
  | { kind: "keep_on"; gapMinutes: number };

/** O que a IA planeja fazer com o ar-condicionado antes de uma aula. */
export function getAIPlan(event: ScheduleEvent, ctx: ScheduleCtx = MOCK_CTX): AIPlan {
  const start = toMinutes(event.start);

  const previousEnd = ctx.events
    .filter(
      (e) => e.roomId === event.roomId && e.weekday === event.weekday && toMinutes(e.end) <= start,
    )
    .reduce<number | null>((latest, e) => {
      const end = toMinutes(e.end);
      return latest === null || end > latest ? end : latest;
    }, null);

  if (previousEnd !== null && start - previousEnd < KEEP_ON_GAP_MIN) {
    return { kind: "keep_on", gapMinutes: start - previousEnd };
  }

  const room = ctx.rooms.find((r) => r.id === event.roomId);
  const minutes = getPreCoolMinutes(event.roomId, room?.capacity, ctx === MOCK_CTX);
  return { kind: "pre_cool", minutes, at: minutesToTime(Math.max(0, start - minutes)) };
}

// ───────── Situação de hoje ─────────
export type EventStatus = "done" | "ongoing" | "upcoming";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  done: "Encerrada",
  ongoing: "Em andamento",
  upcoming: "Em breve",
};

/** null quando a aula não é de hoje. */
export function getEventStatus(event: ScheduleEvent, ctx: ScheduleCtx = MOCK_CTX): EventStatus | null {
  const { weekday, minutes } = ctx.clock;
  if (weekday === null || event.weekday !== weekday) return null;
  if (minutes >= toMinutes(event.end)) return "done";
  if (minutes >= toMinutes(event.start)) return "ongoing";
  return "upcoming";
}

export type TodayAIState = "started" | "waiting" | "blocked";

/** Para aulas que ainda vão começar hoje: a IA já ligou o ar, ainda vai ligar, ou não consegue (falha)? */
export function getTodayAIState(event: ScheduleEvent, ctx: ScheduleCtx = MOCK_CTX): TodayAIState | null {
  if (getEventStatus(event, ctx) !== "upcoming") return null;
  if (ctx.rooms.find((r) => r.id === event.roomId)?.hasIssue) return "blocked";

  const plan = getAIPlan(event, ctx);
  if (plan.kind === "keep_on") return "started";
  return toMinutes(plan.at) <= ctx.clock.minutes ? "started" : "waiting";
}

// ───────── Próximas aulas ─────────
export function describeDay(offset: number, weekday: Weekday): string {
  if (offset === 0) return "hoje";
  if (offset === 1) return "amanhã";
  return WEEKDAY_LABEL[weekday];
}

/** Primeiro dia (hoje ou os seguintes) com aula começando depois de agora. */
function findNext(ctx: ScheduleCtx, roomId?: string) {
  const dow = ctx.clock.weekday ?? 0;
  for (let offset = 0; offset <= 7; offset++) {
    const day = (dow + offset) % 7;
    if (day === 0) continue; // domingo não tem aula
    const list = ctx.events
      .filter(
        (e) =>
          e.weekday === day &&
          (!roomId || e.roomId === roomId) &&
          (offset > 0 || toMinutes(e.start) > ctx.clock.minutes),
      )
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    if (list.length > 0) return { offset, weekday: day as Weekday, list };
  }
  return null;
}

export interface NextStart {
  time: string;
  weekday: Weekday;
  dayOffset: number; // 0 = hoje
  minutesUntil: number;
  count: number; // aulas começando nesse mesmo horário
}

export function getNextStart(ctx: ScheduleCtx): NextStart | null {
  const found = findNext(ctx);
  if (!found) return null;
  const time = found.list[0].start;
  return {
    time,
    weekday: found.weekday,
    dayOffset: found.offset,
    minutesUntil: found.offset * 1440 + toMinutes(time) - ctx.clock.minutes,
    count: found.list.filter((e) => e.start === time).length,
  };
}

export function getNextClassForRoom(
  roomId: string,
  ctx: ScheduleCtx,
): { event: ScheduleEvent; dayOffset: number; weekday: Weekday } | null {
  const found = findNext(ctx, roomId);
  return found ? { event: found.list[0], dayOffset: found.offset, weekday: found.weekday } : null;
}

// ───────── Remanejamento ─────────
/** Sugere uma sala sem problema, com capacidade suficiente, sem aula no horário e a mais fresca. */
export function suggestRelocation(event: ScheduleEvent, ctx: ScheduleCtx = MOCK_CTX): Room | undefined {
  const from = ctx.rooms.find((r) => r.id === event.roomId);
  if (!from) return undefined;

  const start = toMinutes(event.start);
  const end = toMinutes(event.end);

  return ctx.rooms
    .filter(
      (room) =>
        room.id !== from.id &&
        !room.hasIssue &&
        room.capacity >= from.capacity &&
        !ctx.events.some(
          (other) =>
            other.roomId === room.id &&
            other.weekday === event.weekday &&
            toMinutes(other.start) < end &&
            toMinutes(other.end) > start,
        ),
    )
    .sort((a, b) => a.temperature - b.temperature)[0];
}

// ───────── Situação de uma sala pela agenda (salas sem sensor) ─────────
export type AgendaKind = "in_class" | "soon" | "free";

/** Até quantos minutos antes do início a aula conta como "em breve". */
export const SOON_MINUTES = 60;

export interface RoomAgendaState {
  kind: AgendaKind;
  /** in_class: aula em andamento. soon/free: a próxima aula, se houver. */
  event?: ScheduleEvent;
  dayOffset?: number;
  minutesUntil?: number;
}

export function getRoomAgendaState(roomId: string, ctx: ScheduleCtx): RoomAgendaState {
  const { weekday, minutes } = ctx.clock;

  if (weekday !== null) {
    const current = ctx.events.find(
      (e) =>
        e.roomId === roomId &&
        e.weekday === weekday &&
        toMinutes(e.start) <= minutes &&
        minutes < toMinutes(e.end),
    );
    if (current) return { kind: "in_class", event: current };
  }

  const next = getNextClassForRoom(roomId, ctx);
  if (!next) return { kind: "free" };

  const minutesUntil = next.dayOffset * 1440 + toMinutes(next.event.start) - minutes;
  return {
    kind: next.dayOffset === 0 && minutesUntil <= SOON_MINUTES ? "soon" : "free",
    event: next.event,
    dayOffset: next.dayOffset,
    minutesUntil,
  };
}