import { rooms as mockRooms } from "@/data/rooms";
import { scheduleEvents } from "@/data/schedule";
import { gauss, hash01 } from "@/lib/ml/rng";

// ───────── Tempo simulado: 1 tick = 5 minutos. Dia 0 = segunda-feira. ─────────
export const TICK_MIN = 5;
export const TICKS_PER_DAY = 288;
export const SEED = 20261106;
export const TARGET_T = 23;
export const OP_START_MIN = 5 * 60;
export const OP_END_MIN = 23 * 60 + 30;
export const WEEKDAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function timeOf(tick: number) {
  const day = Math.floor(tick / TICKS_PER_DAY);
  return { day, weekday: (day % 7) + 1, min: (tick % TICKS_PER_DAY) * TICK_MIN };
}
export const hhmm = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export function clockLabel(tick: number): string {
  const t = timeOf(tick);
  return `${WEEKDAY_NAMES[t.weekday - 1]} ${hhmm(t.min)}`;
}
export const isOperating = (min: number) => min >= OP_START_MIN && min < OP_END_MIN;

// ───────── Salas (parâmetros físicos ESCONDIDOS da IA) ─────────
export interface RoomCfg {
  idx: number;
  id: string;
  name: string;
  capacity: number;
  rated: number; // kW do ar-condicionado
  lightsKw: number;
  a: number; // taxa com que a sala troca calor com o ambiente externo (por tick)
  b: number; // °C por pessoa por tick
  cMax: number; // °C por tick que o ar consegue resfriar
}

export const ROOM_CFG: RoomCfg[] = mockRooms.map((r, idx) => ({
  idx,
  id: r.id,
  name: r.name,
  capacity: r.capacity,
  rated: r.capacity * 0.075,
  lightsKw: r.capacity * 0.012,
  a: 0.02 * (0.9 + 0.2 * hash01(SEED, 11, idx)),
  b: 0.004,
  cMax: 0.6 * Math.sqrt(40 / r.capacity),
}));

// ───────── Aulas (vêm de data/schedule.ts) ─────────
export interface ClassEv {
  num: number;
  roomIdx: number;
  weekday: number;
  start: number; // minutos desde 00:00
  end: number;
  course: string;
  attBase: number; // fração da capacidade que costuma comparecer
  noShow: number; // chance ESCONDIDA de a turma não aparecer
}

const NO_SHOW: Record<string, number> = {
  "C-101|5": 0.5,
  "A-102|5": 0.4,
  "B-101|1": 0.3,
  "C-102|5": 0.3,
};

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const EVENTS = new Map<string, ClassEv[]>();
const EMPTY: ClassEv[] = [];

scheduleEvents.forEach((e, num) => {
  const roomIdx = ROOM_CFG.findIndex((r) => r.id === e.roomId);
  if (roomIdx < 0) return;
  const key = `${roomIdx}|${e.weekday}`;
  const list = EVENTS.get(key) ?? [];
  list.push({
    num,
    roomIdx,
    weekday: e.weekday,
    start: toMin(e.start),
    end: toMin(e.end),
    course: e.course,
    attBase: 0.55 + 0.35 * hash01(SEED, 7, num),
    noShow: NO_SHOW[`${e.roomId}|${e.weekday}`] ?? 0.04,
  });
  EVENTS.set(key, list);
});
EVENTS.forEach((list) => list.sort((a, b) => a.start - b.start));

export function eventsOf(roomIdx: number, weekday: number): readonly ClassEv[] {
  return EVENTS.get(`${roomIdx}|${weekday}`) ?? EMPTY;
}

// ───────── Cenários injetados pelo usuário (compartilhados pelos 3 mundos) ─────────
export interface Scenario {
  heatOffset: number;
  cancelled: Set<string>; // `${dia}:${num da aula}`
  failedAc: Set<number>; // índices de salas com ar quebrado
}
export const newScenario = (): Scenario => ({ heatOffset: 0, cancelled: new Set(), failedAc: new Set() });

// ───────── Verdade do mundo ─────────
export function eventAbsent(ev: ClassEv, day: number, sc: Scenario): boolean {
  return sc.cancelled.has(`${day}:${ev.num}`) || hash01(SEED, 21, day, ev.num) < ev.noShow;
}

export function truePeople(roomIdx: number, tick: number, sc: Scenario): number {
  const { day, weekday, min } = timeOf(tick);
  const cap = ROOM_CFG[roomIdx].capacity;
  for (const ev of eventsOf(roomIdx, weekday)) {
    if (min < ev.start - 10 || min > ev.end) continue;
    if (eventAbsent(ev, day, sc)) continue;
    const full = Math.round(cap * ev.attBase * (0.9 + 0.2 * hash01(SEED, 22, day, ev.num)));
    const arrive = Math.min(1, Math.max(0, (min - (ev.start - 10)) / 15));
    const leave = Math.min(1, Math.max(0, (ev.end - 6 - min) / 12)); // a turma sai ~12 min antes
    return Math.round(full * Math.min(arrive, leave));
  }
  if (min >= 7 * 60 && min <= 22 * 60 && hash01(SEED, 23, roomIdx, Math.floor(tick / 6)) < 0.03) return 2; // estudo individual
  return 0;
}

/** Existe aula real (não faltou) em curso ou começando em até 60 min? Usado só para medir desperdício. */
export function classExpected(roomIdx: number, tick: number, sc: Scenario): boolean {
  const { day, weekday, min } = timeOf(tick);
  return eventsOf(roomIdx, weekday).some(
    (ev) => min >= ev.start - 60 && min <= ev.end && !eventAbsent(ev, day, sc),
  );
}

export function outdoorTemp(tick: number, sc: Scenario): number {
  const day = Math.floor(tick / TICKS_PER_DAY);
  const hour = ((tick % TICKS_PER_DAY) * TICK_MIN) / 60;
  const dayMean = 28 + 4 * (hash01(SEED, 41, day) - 0.5);
  return dayMean + 5 * Math.cos((2 * Math.PI * (hour - 15)) / 24) + sc.heatOffset;
}

// ───────── Sensores (com ruído) ─────────
export function senseTemp(T: number, roomIdx: number, tick: number): number {
  return T + 0.06 * gauss(SEED, 31, roomIdx, tick);
}
export function sensePeople(p: number, roomIdx: number, tick: number): number {
  if (p === 0) return 0;
  const u = hash01(SEED, 32, roomIdx, tick);
  if (p <= 3 && hash01(SEED, 33, roomIdx, tick) < 0.02) return 0; // falha do sensor de presença
  return Math.max(0, p + (u < 0.1 ? -1 : u > 0.9 ? 1 : 0));
}

// ───────── Física de uma sala ─────────
export interface RoomState {
  T: number;
  ac: boolean;
  lights: boolean;
}

export function stepRoom(
  cfg: RoomCfg,
  s: RoomState,
  tick: number,
  people: number,
  tout: number,
  sc: Scenario,
): { kw: number; kwh: number } {
  const failed = sc.failedAc.has(cfg.idx);
  const tPre = s.T + cfg.a * (tout - s.T) + cfg.b * people + 0.03 * gauss(SEED, 51, cfg.idx, tick);
  // Termostato: o ar só resfria o necessário para chegar ao alvo, limitado a cMax por tick.
  const cooling = s.ac && !failed ? Math.min(cfg.cMax, Math.max(0, tPre - TARGET_T)) : 0;
  s.T = tPre - cooling;
  const acKw = s.ac ? cfg.rated * (failed ? 0.35 : 0.08 + (0.92 * cooling) / cfg.cMax) : 0;
  const kw = acKw + (s.lights ? cfg.lightsKw : 0);
  return { kw, kwh: (kw * TICK_MIN) / 60 };
}