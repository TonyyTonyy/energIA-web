import { hash01 } from "@/lib/ml/rng";
import { SEED, eventsOf, timeOf } from "@/lib/ml/world";

export interface Cmd {
  ac: boolean;
  lights: boolean;
}

/** Como é hoje: o funcionário liga 30 min antes da 1ª aula e só desliga na ronda das 22:45. */
export function manualCmd(roomIdx: number, tick: number): Cmd {
  const { weekday, min } = timeOf(tick);
  const evs = eventsOf(roomIdx, weekday);
  if (evs.length === 0) return { ac: false, lights: false };
  const first = evs[0].start;
  return { ac: min >= first - 30 && min < 22 * 60 + 45, lights: min >= first - 15 && min < 22 * 60 + 45 };
}

/** Timer fixo pela agenda, sem IA: liga 30 min antes de cada aula e desliga no horário de término. */
export function ruleCmd(roomIdx: number, tick: number, explore = false): Cmd {
  const { day, weekday, min } = timeOf(tick);
  let ac = false;
  let lights = false;
  for (const ev of eventsOf(roomIdx, weekday)) {
    // "explore" só é usado ao gerar o histórico de treino: varia a antecedência para o modelo térmico ver mais situações
    const lead = explore && hash01(SEED, 61, day, ev.num) < 0.25 ? 0 : 30;
    if (min >= ev.start - lead && min < ev.end) ac = true;
    if (min >= ev.start - 5 && min < ev.end) lights = true;
  }
  return { ac, lights };
}