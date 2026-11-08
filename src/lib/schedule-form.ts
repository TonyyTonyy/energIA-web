import { WEEKDAY_LABEL } from "@/lib/constants";
import { toMinutes } from "@/lib/schedule-utils";
import type { Room, ScheduleEvent, Weekday } from "@/types";

export const SCHEDULE_LIMITS = {
  textMax: 60,
  minDurationMin: 15,
  dayStart: "05:00",
  dayEnd: "23:30",
} as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_CONFLICTS_SHOWN = 4;

export const seriesOf = (event: ScheduleEvent): string => event.seriesId ?? event.id;

// ───────── Formulário ─────────
export interface EventFormValues {
  roomId: string;
  course: string;
  teacher: string;
  weekdays: Weekday[];
  start: string;
  end: string;
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>> & { conflicts?: string[] };

export interface EventInput {
  roomId: string;
  course: string;
  teacher: string;
  weekdays: Weekday[];
  start: string;
  end: string;
}

export type EventValidation = { ok: true; value: EventInput } | { ok: false; errors: EventFormErrors };

export function emptyEventForm(): EventFormValues {
  return { roomId: "", course: "", teacher: "", weekdays: [], start: "19:00", end: "22:30" };
}

/** `series` = todas as ocorrências (dias) da aula, com ao menos uma. */
export function eventToForm(series: ScheduleEvent[]): EventFormValues {
  const first = series[0];
  return {
    roomId: first.roomId,
    course: first.course,
    teacher: first.teacher,
    weekdays: series.map((e) => e.weekday).sort((a, b) => a - b),
    start: first.start,
    end: first.end,
  };
}

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** "Prof. Helena Prado" e "helena prado" são o mesmo professor. */
export const teacherKey = (s: string) => normalize(collapse(s)).replace(/^(profa?|professora?|dra?)\.?\s+/, "");

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;

function findConflicts(
  input: EventInput,
  rooms: Room[],
  events: ScheduleEvent[],
  ignore: ReadonlySet<string>,
): string[] {
  const start = toMinutes(input.start);
  const end = toMinutes(input.end);
  const key = teacherKey(input.teacher);
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
  const found: string[] = [];

  for (const day of input.weekdays) {
    for (const other of events) {
      if (ignore.has(other.id) || other.weekday !== day) continue;
      if (!overlaps(start, end, toMinutes(other.start), toMinutes(other.end))) continue;

      const when = `${other.start}–${other.end}`;
      if (other.roomId === input.roomId) {
        found.push(`${WEEKDAY_LABEL[day]}: ${roomName(other.roomId)} já tem ${other.course} (${when}).`);
      } else if (key && teacherKey(other.teacher) === key) {
        found.push(
          `${WEEKDAY_LABEL[day]}: ${other.teacher} já dá ${other.course} em ${roomName(other.roomId)} (${when}).`,
        );
      }
    }
  }

  if (found.length <= MAX_CONFLICTS_SHOWN) return found;
  const rest = found.length - MAX_CONFLICTS_SHOWN;
  return [...found.slice(0, MAX_CONFLICTS_SHOWN), `… e mais ${rest} ${rest === 1 ? "conflito" : "conflitos"}.`];
}

/** `ignoreIds` = ocorrências da própria aula (em edição), que não contam como conflito. */
export function validateEventForm(
  values: EventFormValues,
  rooms: Room[],
  events: ScheduleEvent[],
  ignoreIds: ReadonlySet<string>,
): EventValidation {
  const L = SCHEDULE_LIMITS;
  const errors: EventFormErrors = {};

  if (!rooms.some((r) => r.id === values.roomId)) errors.roomId = "Escolha a sala.";

  const course = collapse(values.course);
  if (!course) errors.course = "Informe a disciplina.";
  else if (course.length > L.textMax) errors.course = `Use no máximo ${L.textMax} caracteres.`;

  const teacher = collapse(values.teacher);
  if (!teacher) errors.teacher = "Informe o professor.";
  else if (teacher.length > L.textMax) errors.teacher = `Use no máximo ${L.textMax} caracteres.`;

  if (values.weekdays.length === 0) errors.weekdays = "Escolha ao menos um dia da semana.";

  if (!TIME_PATTERN.test(values.start)) errors.start = "Informe o horário de início.";
  if (!TIME_PATTERN.test(values.end)) errors.end = "Informe o horário de término.";
  if (!errors.start && !errors.end) {
    const s = toMinutes(values.start);
    const e = toMinutes(values.end);
    if (e <= s) errors.end = "O término deve ser depois do início.";
    else if (e - s < L.minDurationMin) errors.end = `A aula precisa durar ao menos ${L.minDurationMin} min.`;
    else if (s < toMinutes(L.dayStart)) errors.start = `As aulas começam a partir das ${L.dayStart}.`;
    else if (e > toMinutes(L.dayEnd)) errors.end = `As aulas terminam até as ${L.dayEnd}.`;
  }

  const input: EventInput = {
    roomId: values.roomId,
    course,
    teacher,
    weekdays: [...values.weekdays].sort((a, b) => a - b),
    start: values.start,
    end: values.end,
  };

  if (!errors.roomId && !errors.weekdays && !errors.start && !errors.end) {
    const conflicts = findConflicts(input, rooms, events, ignoreIds);
    if (conflicts.length > 0) errors.conflicts = conflicts;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: input };
}

const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

/**
 * Transforma o formulário em ocorrências (uma por dia).
 * Em edição, `existing` são as ocorrências antigas: os dias mantidos reaproveitam o id.
 */
export function buildEvents(
  input: EventInput,
  existing: ScheduleEvent[],
): { remove: string[]; add: ScheduleEvent[] } {
  const seriesId = existing.length > 0 ? seriesOf(existing[0]) : uid();
  const idByDay = new Map(existing.map((e) => [e.weekday, e.id]));

  return {
    remove: existing.map((e) => e.id),
    add: input.weekdays.map((weekday) => ({
      id: idByDay.get(weekday) ?? `ev-${uid()}-${weekday}`,
      seriesId,
      roomId: input.roomId,
      course: input.course,
      teacher: input.teacher,
      weekday,
      start: input.start,
      end: input.end,
    })),
  };
}

/** [2, 4] → "Ter e Qui" */
export function weekdaysLabel(days: Weekday[]): string {
  const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAY_LABEL[d].slice(0, 3));
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}