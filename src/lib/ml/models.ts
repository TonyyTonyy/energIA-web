import { ROOM_CFG, TICK_MIN, eventsOf, timeOf } from "@/lib/ml/world";

export type Phase = "treino" | "ao vivo";
export interface LossPoint {
  step: number;
  loss: number;
  acc: number;
  phase: Phase;
}

/** Horizontes (min) em que o modelo prevê a ocupação. */
export const HORIZONS = [15, 30, 45, 60, 90] as const;

const BASE_FEATURES = [
  "viés (bias)",
  "aula agendada",
  "agendada × taxa de comparecimento",
  "últimos 15 min da aula",
  "primeiros 10 min da aula",
  "ocupada agora",
  "ocupada agora × horizonte",
  "tempo vazia (até 60 min)",
  "horizonte da previsão",
  "agendada × ocupada agora",
  "hora do dia (seno)",
  "hora do dia (cosseno)",
  "sábado",
  "fora de aula (horário de estudo)",
  "aula em curso há 15+ min × tempo vazia",
];
export const FEATURE_NAMES = [...BASE_FEATURES, ...ROOM_CFG.map((r) => `sala ${r.id}`)];
export const N_FEATURES = FEATURE_NAMES.length;

// ───────── Regressão logística online (SGD + L2) ─────────
export class OnlineLogistic {
  readonly w = new Float64Array(N_FEATURES);

  predict(x: number[]): number {
    let z = 0;
    for (let i = 0; i < N_FEATURES; i++) z += this.w[i] * x[i];
    return 1 / (1 + Math.exp(-z));
  }

  step(x: number[], err: number, lr: number) {
    for (let i = 0; i < N_FEATURES; i++) this.w[i] -= lr * (err * x[i] + 1e-4 * this.w[i]);
  }
}

// ───────── Modelo de ocupação ─────────
export class OccupancyModel {
  readonly clf = new OnlineLogistic();
  lr = 0.1;
  steps = 0;
  lossEma = Math.LN2;
  accEma = 0.5;
  lastOk = false;
  history: LossPoint[] = [];
  bins = Array.from({ length: 10 }, () => ({ n: 0, pos: 0, sumP: 0 }));
  private attend = new Map<string, number>();

  /** Taxa histórica de comparecimento da sala naquele dia da semana (feature aprendida dos dados). */
  attendRate(room: number, weekday: number): number {
    return this.attend.get(`${room}|${weekday}`) ?? 0.85;
  }
  updateAttend(room: number, weekday: number, attended: 0 | 1) {
    this.attend.set(`${room}|${weekday}`, this.attendRate(room, weekday) * 0.7 + attended * 0.3);
  }

  predict(x: number[]): number {
    return this.clf.predict(x);
  }

  /** Previsão primeiro, atualização depois (avaliação prequential). Devolve a perda. */
  learn(x: number[], y: 0 | 1, phase: Phase): number {
    const p = this.clf.predict(x);
    const loss = -(y * Math.log(p + 1e-9) + (1 - y) * Math.log(1 - p + 1e-9));
    this.lastOk = (p >= 0.5 ? 1 : 0) === y;
    this.clf.step(x, p - y, this.lr);
    this.steps++;
    this.lossEma += 0.002 * (loss - this.lossEma);
    this.accEma += 0.002 * ((this.lastOk ? 1 : 0) - this.accEma);
    if (phase === "ao vivo") {
      const b = Math.min(9, Math.floor(p * 10));
      this.bins[b].n++;
      this.bins[b].pos += y;
      this.bins[b].sumP += p;
    }
    if (this.steps % (phase === "treino" ? 2000 : 400) === 0) {
      this.history.push({ step: this.steps, loss: this.lossEma, acc: this.accEma, phase });
      if (this.history.length > 500) this.history = this.history.filter((_, i) => i % 2 === 0);
    }
    return loss;
  }
}

/** Features para prever "a sala estará ocupada daqui a h minutos?" */
export function occupancyFeatures(
  m: OccupancyModel,
  room: number,
  tick: number,
  h: number,
  occNow: boolean,
  vacantMin: number,
): number[] {
  const now = timeOf(tick);
  const fut = timeOf(tick + Math.round(h / TICK_MIN));
  const evF = eventsOf(room, fut.weekday).find((e) => e.start <= fut.min && fut.min <= e.end);
  const evN = eventsOf(room, now.weekday).find((e) => e.start <= now.min && now.min < e.end);
  const sched = evF ? 1 : 0;
  const occ = occNow ? 1 : 0;
  const vac = Math.min(vacantMin, 60) / 60;
  const hist = m.attendRate(room, fut.weekday);
  const startedNow = evN && now.min - evN.start >= 15 ? 1 : 0;

  const x = new Array<number>(N_FEATURES).fill(0);
  x[0] = 1;
  x[1] = sched;
  x[2] = sched * hist;
  x[3] = evF && evF.end - fut.min <= 15 ? 1 : 0;
  x[4] = evF && fut.min - evF.start <= 10 ? 1 : 0;
  x[5] = occ;
  x[6] = (occ * h) / 90;
  x[7] = vac;
  x[8] = h / 90;
  x[9] = sched * occ;
  x[10] = Math.sin((2 * Math.PI * fut.min) / 1440);
  x[11] = Math.cos((2 * Math.PI * fut.min) / 1440);
  x[12] = fut.weekday === 6 ? 1 : 0;
  x[13] = !sched && fut.min >= 420 && fut.min <= 1320 ? 1 : 0;
  x[14] = startedNow * vac;
  x[15 + room] = 1;
  return x;
}

// ───────── Modelo térmico: mínimos quadrados recursivos (RLS) ─────────
// ΔT = a·(Tout − T) + b·pessoas − c·[ar resfriando em potência máxima]
export class ThermalModel {
  theta = [0, 0, -0.2];
  n = 0;
  maeEma = 0.1;
  private P = [
    [100, 0, 0],
    [0, 100, 0],
    [0, 0, 100],
  ];

  get a() {
    return this.theta[0];
  }
  get b() {
    return this.theta[1];
  }
  get c() {
    return -this.theta[2];
  }

  predict(x: number[]): number {
    return this.theta[0] * x[0] + this.theta[1] * x[1] + this.theta[2] * x[2];
  }

  update(x: number[], y: number) {
    const P = this.P;
    const Px = [0, 1, 2].map((i) => P[i][0] * x[0] + P[i][1] * x[1] + P[i][2] * x[2]);
    const denom = 1 + x[0] * Px[0] + x[1] * Px[1] + x[2] * Px[2];
    const K = Px.map((v) => v / denom);
    const err = y - this.predict(x);
    for (let i = 0; i < 3; i++) this.theta[i] += K[i] * err;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) P[i][j] -= K[i] * Px[j];
    this.n++;
    this.maeEma += 0.01 * (Math.abs(err) - this.maeEma);
  }
}