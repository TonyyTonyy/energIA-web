import { rooms as mockRooms } from "@/data/rooms";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatKwh, formatTemp } from "@/lib/format";
import type { Room, SimulationInput, SimulationResult } from "@/types";

export const SEASON_LABEL: Record<SimulationInput["season"], string> = {
  verao: "Verão",
  outono: "Outono",
  inverno: "Inverno",
  primavera: "Primavera",
};

export const DEFAULT_SIMULATION_INPUT: SimulationInput = {
  roomId: "A-101",
  idleHours: 3,
  outsideTemperature: 31,
  season: "primavera",
};

// ───────── Modelo simplificado (apenas para demonstração) ─────────
const ROOM_WARMING_TAU_H = 2; // constante de tempo com que a sala esquenta sem ar
const SEASON_PRECOOL_FACTOR: Record<SimulationInput["season"], number> = {
  verao: 1.15,
  primavera: 1.05,
  outono: 0.95,
  inverno: 0.85,
};
const MIN_SAVING_KWH = 0.05; // abaixo disso, considera empate (mantém ligado)
const WORKING_DAYS_PER_MONTH = 22;

export interface SimulationDetails extends SimulationResult {
  input: SimulationInput;
  roomName: string;
  acRatedKw: number;
  maintainLoad: number; // 0–1: carga média do ar mantendo a sala vazia
  offHours: number; // tempo com o ar desligado
  preCoolHours: number; // tempo de pré-resfriamento antes da aula
  restartTemperature: number; // °C da sala quando o ar é religado
  targetTemperature: number;
  monthlySavingBRL: number;
}

export interface ComparisonPoint {
  hours: number;
  keepOn: number; // kWh acumulados
  turnOff: number; // kWh acumulados
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** 0.75 → "45 min" · 1.5 → "1h30" · 3 → "3h" */
export function formatDuration(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function simulate(input: SimulationInput, roomList: Room[] = mockRooms): SimulationDetails {
  const room = roomList.find((r) => r.id === input.roomId) ?? roomList[0];
  const target = room.targetTemperature;
  const idle = input.idleHours;

  const acRatedKw = room.capacity * 0.075;
  const gap = Math.max(0, input.outsideTemperature - target);
  const maintainLoad = clamp(0.1 + 0.031 * (input.outsideTemperature - target), 0.1, 0.8);
  const sizeFactor = clamp(room.capacity / 40, 0.8, 1.25);
  const seasonFactor = SEASON_PRECOOL_FACTOR[input.season];

  // Quanto a sala esquenta depois de ficar "offHours" sem ar
  const warmingAt = (offHours: number) => gap * (1 - Math.exp(-offHours / ROOM_WARMING_TAU_H));

  // Tempo de pré-resfriamento necessário para voltar ao alvo
  const preCoolHoursAt = (offHours: number) => {
    const delta = warmingAt(offHours);
    const minutes = (15 * Math.min(1, delta / 2) + 4.6 * delta) * sizeFactor * seasonFactor;
    return Math.min(minutes, 120) / 60;
  };

  // Acha o instante de desligar: off + preCool = intervalo (bisseção)
  let lo = 0;
  let hi = idle;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (mid + preCoolHoursAt(mid) > idle) hi = mid;
    else lo = mid;
  }
  const offHours = (lo + hi) / 2;
  const preCoolHours = Math.max(0, idle - offHours);
  const restartTemperature = round(target + warmingAt(offHours), 1);

  const keepOnKwh = round(acRatedKw * maintainLoad * idle);
  const turnOffKwh = round(acRatedKw * preCoolHours);
  const diff = keepOnKwh - turnOffKwh;

  const recommended: SimulationResult["recommended"] = diff > MIN_SAVING_KWH ? "turn_off" : "keep_on";
  const savingKwh = round(recommended === "turn_off" ? diff : Math.max(0, -diff));
  const savingBRL = round(savingKwh * TARIFF_BRL_PER_KWH);
  const preCoolMinutes = Math.round(preCoolHours * 60);

  const idleLabel = formatDuration(idle);
  let explanation: string;

  if (gap < 0.5) {
    explanation =
      `A temperatura externa (${input.outsideTemperature} °C) já está próxima do alvo da sala, então quase não há o que refrigerar. ` +
      `Desligar o ar por ${idleLabel} gasta ${formatKwh(turnOffKwh)}, contra ${formatKwh(keepOnKwh)} de mantê-lo ligado.`;
  } else if (recommended === "turn_off") {
    explanation =
      `Em ${idleLabel} sem aula, manter o ar ligado gastaria ${formatKwh(keepOnKwh)}. ` +
      `Desligando agora, a sala fica ${formatDuration(offHours)} sem ar, sobe para cerca de ${formatTemp(restartTemperature)} ` +
      `e o ar é religado ${preCoolMinutes} min antes da aula para voltar a ${formatTemp(target)}, gastando ${formatKwh(turnOffKwh)}.`;
  } else {
    explanation =
      `Em um intervalo de ${idleLabel}, a sala não esquenta o bastante para compensar desligar. ` +
      `O pré-resfriamento de ${preCoolMinutes} min gastaria ${formatKwh(turnOffKwh)}, contra ${formatKwh(keepOnKwh)} de manter o ar ligado.`;
  }

  return {
    keepOnKwh,
    turnOffKwh,
    recommended,
    savingKwh,
    savingBRL,
    preCoolMinutes,
    explanation,
    input,
    roomName: room.name,
    acRatedKw,
    maintainLoad,
    offHours,
    preCoolHours,
    restartTemperature,
    targetTemperature: target,
    monthlySavingBRL: round(savingBRL * WORKING_DAYS_PER_MONTH, 0),
  };
}

/** Consumo acumulado (kWh) das duas estratégias, de agora até o início da aula. */
export function buildComparisonSeries(details: SimulationDetails): ComparisonPoint[] {
  const idle = details.input.idleHours;
  const times = new Set<number>();

  for (let i = 0; i / 6 < idle; i++) times.add(round(i / 6, 4)); // a cada 10 min
  times.add(round(details.offHours, 4));
  times.add(round(idle, 4));

  return Array.from(times)
    .sort((a, b) => a - b)
    .map((t) => ({
      hours: t,
      keepOn: round(details.acRatedKw * details.maintainLoad * t),
      turnOff: round(t <= details.offHours ? 0 : details.acRatedKw * (t - details.offHours)),
    }));
}