import { WEEKDAY_LABEL } from "@/lib/constants";
import { ROOM_CODE_PATTERN, ROOM_LIMITS, createRoom } from "@/lib/room-utils";
import { SCHEDULE_LIMITS, teacherKey } from "@/lib/schedule-form";
import { toMinutes } from "@/lib/schedule-utils";
import type { Room, ScheduleEvent, Weekday } from "@/types";

export const EXPORT_APP = "energia";
export const EXPORT_VERSION = 1;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

const MAX_ROOMS = 500;
const MAX_EVENTS = 5000;
const MAX_SHOWN = 6;
const MAX_COLLECTED = 40;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// ───────── Exportação ─────────
/** Só salas e aulas cadastradas: nunca os dados simulados. */
export function buildExport(rooms: Room[], events: ScheduleEvent[]): string {
  return JSON.stringify(
    {
      app: EXPORT_APP,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        block: r.block,
        floor: r.floor,
        capacity: r.capacity,
        targetTemperature: r.targetTemperature,
      })),
      events: events.map((e) => ({
        id: e.id,
        seriesId: e.seriesId,
        roomId: e.roomId,
        course: e.course,
        teacher: e.teacher,
        weekday: e.weekday,
        start: e.start,
        end: e.end,
      })),
    },
    null,
    2,
  );
}

// ───────── Importação ─────────
export type ImportResult =
  | { ok: true; rooms: Room[]; events: ScheduleEvent[] }
  | { ok: false; errors: string[] };

const fail = (errors: string[]): ImportResult => {
  const shown = errors.slice(0, MAX_SHOWN);
  const rest = errors.length - shown.length;
  return {
    ok: false,
    errors: rest > 0 ? [...shown, `… e mais ${rest} ${rest === 1 ? "problema" : "problemas"}.`] : shown,
  };
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const clean = (v: unknown): string => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

const intIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

function checkTimes(start: unknown, end: unknown): string | null {
  if (typeof start !== "string" || !TIME_PATTERN.test(start) || typeof end !== "string" || !TIME_PATTERN.test(end)) {
    return "os horários devem estar no formato HH:MM.";
  }
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e <= s) return "o término deve ser depois do início.";
  if (e - s < SCHEDULE_LIMITS.minDurationMin) {
    return `a aula precisa durar ao menos ${SCHEDULE_LIMITS.minDurationMin} min.`;
  }
  if (s < toMinutes(SCHEDULE_LIMITS.dayStart) || e > toMinutes(SCHEDULE_LIMITS.dayEnd)) {
    return `os horários devem ficar entre ${SCHEDULE_LIMITS.dayStart} e ${SCHEDULE_LIMITS.dayEnd}.`;
  }
  return null;
}

export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail(["O arquivo não é um JSON válido."]);
  }

  if (!isObj(data)) return fail(["Formato inesperado: esperava um objeto com as listas de salas e aulas."]);
  if (data.app !== undefined && data.app !== EXPORT_APP) {
    return fail(["Este arquivo não foi gerado pelo EnergIA."]);
  }
  if (typeof data.version === "number" && data.version > EXPORT_VERSION) {
    return fail(["O arquivo é de uma versão mais nova do EnergIA e não pode ser importado aqui."]);
  }
  if (!Array.isArray(data.rooms)) return fail(['O arquivo não tem a lista de salas (campo "rooms").']);

  const rawEvents: unknown = data.events === undefined ? [] : data.events;
  if (!Array.isArray(rawEvents)) return fail(['O campo "events" deve ser uma lista.']);
  if (data.rooms.length > MAX_ROOMS) return fail([`O arquivo tem salas demais (máximo de ${MAX_ROOMS}).`]);
  if (rawEvents.length > MAX_EVENTS) return fail([`O arquivo tem aulas demais (máximo de ${MAX_EVENTS}).`]);

  const L = ROOM_LIMITS;
  const errors: string[] = [];

  // ───── Salas ─────
  const rooms: Room[] = [];
  const idByLower = new Map<string, string>();
  const blockByLower = new Map<string, string>();

  data.rooms.forEach((item: unknown, i: number) => {
    const label = `Sala ${i + 1}`;
    if (!isObj(item)) {
      errors.push(`${label}: formato inválido.`);
      return;
    }

    const id = clean(item.id).toUpperCase();
    if (!id || id.length > L.codeMax || !ROOM_CODE_PATTERN.test(id)) {
      errors.push(`${label}: código inválido (${id || "vazio"}).`);
      return;
    }
    if (idByLower.has(id.toLowerCase())) {
      errors.push(`${label}: o código ${id} aparece mais de uma vez.`);
      return;
    }

    const problems: string[] = [];
    const name = clean(item.name) || `Sala ${id}`;
    if (name.length > L.nameMax) problems.push(`nome com mais de ${L.nameMax} caracteres.`);

    const blockRaw = clean(item.block);
    if (!blockRaw || blockRaw.length > L.blockMax) problems.push("bloco ausente ou longo demais.");

    if (!intIn(item.floor, L.floorMin, L.floorMax)) problems.push(`andar deve ser um inteiro de ${L.floorMin} a ${L.floorMax}.`);
    if (!intIn(item.capacity, L.capacityMin, L.capacityMax)) {
      problems.push(`capacidade deve ser um inteiro de ${L.capacityMin} a ${L.capacityMax}.`);
    }
    const temp = item.targetTemperature;
    if (typeof temp !== "number" || !Number.isFinite(temp) || temp < L.tempMin || temp > L.tempMax) {
      problems.push(`temperatura alvo deve ficar entre ${L.tempMin} e ${L.tempMax} °C.`);
    }

    if (problems.length > 0 || !intIn(item.floor, L.floorMin, L.floorMax) || !intIn(item.capacity, L.capacityMin, L.capacityMax) || typeof temp !== "number") {
      errors.push(`${label} (${id}): ${problems.join(" ")}`);
      return;
    }

    const key = blockRaw.toLowerCase();
    const block = blockByLower.get(key) ?? blockRaw;
    blockByLower.set(key, block);

    idByLower.set(id.toLowerCase(), id);
    rooms.push(
      createRoom({
        id,
        name,
        block,
        floor: item.floor,
        capacity: item.capacity,
        targetTemperature: Math.round(temp * 2) / 2,
      }),
    );
  });

  // ───── Aulas ─────
  const events: ScheduleEvent[] = [];
  const usedIds = new Set<string>();

  rawEvents.forEach((item: unknown, i: number) => {
    const label = `Aula ${i + 1}`;
    if (!isObj(item)) {
      errors.push(`${label}: formato inválido.`);
      return;
    }

    const problems: string[] = [];
    const roomId = idByLower.get(clean(item.roomId).toLowerCase());
    if (!roomId) problems.push(`a sala "${clean(item.roomId)}" não existe no arquivo.`);

    const course = clean(item.course);
    if (!course || course.length > SCHEDULE_LIMITS.textMax) problems.push("disciplina ausente ou longa demais.");
    const teacher = clean(item.teacher);
    if (!teacher || teacher.length > SCHEDULE_LIMITS.textMax) problems.push("professor ausente ou longo demais.");

    if (!intIn(item.weekday, 1, 6)) problems.push("o dia da semana deve ser de 1 (segunda) a 6 (sábado).");
    const timeProblem = checkTimes(item.start, item.end);
    if (timeProblem) problems.push(timeProblem);

    if (
      problems.length > 0 ||
      !roomId ||
      !intIn(item.weekday, 1, 6) ||
      typeof item.start !== "string" ||
      typeof item.end !== "string"
    ) {
      errors.push(`${label}: ${problems.join(" ")}`);
      return;
    }

    const rawId = typeof item.id === "string" ? item.id.trim() : "";
    const id = rawId && !usedIds.has(rawId) ? rawId : `ev-${uid()}-${i}`;
    usedIds.add(id);

    const seriesId = typeof item.seriesId === "string" && item.seriesId.trim() ? item.seriesId.trim() : undefined;
    events.push({
      id,
      seriesId,
      roomId,
      course,
      teacher,
      weekday: item.weekday as Weekday,
      start: item.start,
      end: item.end,
    });
  });

  if (errors.length > 0) return fail(errors);

  // Aulas com o mesmo seriesId só ficam agrupadas se forem de fato a mesma aula em dias diferentes.
  const bySeries = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    if (!e.seriesId) continue;
    const list = bySeries.get(e.seriesId) ?? [];
    list.push(e);
    bySeries.set(e.seriesId, list);
  }
  for (const list of bySeries.values()) {
    const f = list[0];
    const consistent =
      new Set(list.map((e) => e.weekday)).size === list.length &&
      list.every(
        (e) =>
          e.roomId === f.roomId &&
          e.course === f.course &&
          e.teacher === f.teacher &&
          e.start === f.start &&
          e.end === f.end,
      );
    if (!consistent) list.forEach((e) => delete e.seriesId);
  }

  // Conflitos de sala e de professor
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
  const conflicts: string[] = [];

  for (let day = 1; day <= 6 && conflicts.length < MAX_COLLECTED; day++) {
    const list = events
      .filter((e) => e.weekday === day)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    for (let a = 0; a < list.length && conflicts.length < MAX_COLLECTED; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const A = list[a];
        const B = list[b];
        if (toMinutes(B.start) >= toMinutes(A.end)) continue;

        const dayName = WEEKDAY_LABEL[day as Weekday];
        if (A.roomId === B.roomId) {
          conflicts.push(`${dayName}: ${roomName(A.roomId)} tem ${A.course} e ${B.course} no mesmo horário.`);
        } else if (teacherKey(A.teacher) === teacherKey(B.teacher)) {
          conflicts.push(`${dayName}: ${A.teacher} dá ${A.course} e ${B.course} no mesmo horário.`);
        }
      }
    }
  }
  if (conflicts.length > 0) return fail(conflicts);

  return { ok: true, rooms, events };
}