import type { AIAction, AITrigger } from "@/types";
import { AIBrain, type DecisionDraft, type Obs } from "@/lib/ml/brain";
import { manualCmd, ruleCmd } from "@/lib/ml/controllers";
import { FEATURE_NAMES, type LossPoint } from "@/lib/ml/models";
import { hash01 } from "@/lib/ml/rng";
import {
  ROOM_CFG,
  SEED,
  TARGET_T,
  TICKS_PER_DAY,
  TICK_MIN,
  WEEKDAY_NAMES,
  classExpected,
  clockLabel,
  eventsOf,
  newScenario,
  outdoorTemp,
  senseTemp,
  sensePeople,
  stepRoom,
  timeOf,
  truePeople,
  type ClassEv,
  type RoomState,
} from "@/lib/ml/world";

export const TRAIN_DAYS = 42; // 6 semanas de histórico
const EPOCH_LR = [0.12, 0.06, 0.03, 0.015];
const yieldUI = () => new Promise<void>((r) => setTimeout(r, 16));

export type Ctl = "manual" | "rule" | "ai";
export type EnginePhase = "idle" | "simulating" | "training" | "ready";

interface Totals {
  kwh: number;
  wasteKwh: number;
  discomfortMin: number;
}
interface WorldState {
  rooms: RoomState[];
  totals: Totals;
}
const makeWorld = (): WorldState => ({
  rooms: ROOM_CFG.map(() => ({ T: 26, ac: false, lights: false })),
  totals: { kwh: 0, wasteKwh: 0, discomfortMin: 0 },
});

export interface LabDecision {
  id: number;
  tick: number;
  clock: string;
  roomId: string;
  roomName: string;
  action: AIAction;
  trigger: AITrigger;
  reason: string;
  probability?: number;
  savingKwh?: number;
  anomaly?: boolean;
}
export interface SeriesPoint {
  label: string;
  manual: number;
  rule: number;
  ai: number;
}
export interface EpochStat {
  epoch: number;
  loss: number;
  acc: number;
}
export interface LabRoomView {
  id: string;
  name: string;
  capacity: number;
  people: number;
  temp: number;
  ac: boolean;
  lights: boolean;
  kw: number;
  pOcc30: number;
  aiFailed: boolean;
  realFailed: boolean;
}
export interface ThermalRow {
  id: string;
  a: number;
  b: number;
  c: number;
  trueA: number;
  trueB: number;
  trueC: number;
  mae: number;
  n: number;
}
export interface LabSnapshot {
  phase: EnginePhase;
  progress: number;
  progressLabel: string;
  tick: number;
  clock: string;
  outdoor: number;
  rooms: LabRoomView[];
  totals: Record<Ctl, Totals>;
  decisions: LabDecision[];
  series: SeriesPoint[];
  epochs: EpochStat[];
  scenario: { heat: boolean; b201Broken: boolean; cancelled: number };
  model: {
    steps: number;
    trainSamples: number;
    lossEma: number;
    accEma: number;
    history: LossPoint[];
    calibration: { p: number; freq: number; n: number }[];
    weights: { name: string; w: number }[];
    thermal: ThermalRow[];
  };
}

export class LabEngine {
  phase: EnginePhase = "idle";
  progress = 0;
  progressLabel = "Aguardando treinamento";
  tick = TRAIN_DAYS * TICKS_PER_DAY + 60; // segunda-feira, 05:00
  readonly scenario = newScenario();
  readonly brain = new AIBrain();
  worlds: Record<Ctl, WorldState> = { manual: makeWorld(), rule: makeWorld(), ai: makeWorld() };
  decisions: LabDecision[] = [];
  series: SeriesPoint[] = [];
  epochs: EpochStat[] = [];
  trainSamples = 0;
  private decisionId = 0;
  private lastPeople: number[] = ROOM_CFG.map(() => 0);
  private lastKw: number[] = ROOM_CFG.map(() => 0);
  private b201 = ROOM_CFG.findIndex((r) => r.id === "B-201");

  constructor() {
    if (this.b201 >= 0) this.scenario.failedAc.add(this.b201); // a B-201 já começa com o ar quebrado
  }

  // ───────── Treinamento: histórico → épocas de SGD ─────────
  async pretrain(onUpdate: () => void): Promise<void> {
    if (this.phase !== "idle") return;
    const brain = this.brain;
    brain.mode = "collect";
    const sc = newScenario();
    const hist = makeWorld();

    this.phase = "simulating";
    for (let t = 0; t < TRAIN_DAYS * TICKS_PER_DAY; t++) {
      const tout = outdoorTemp(t, sc);
      for (let i = 0; i < ROOM_CFG.length; i++) {
        const st = hist.rooms[i];
        const people = truePeople(i, t, sc);
        const obs: Obs = { people: sensePeople(people, i, t), T: senseTemp(st.T, i, t) };
        brain.observe(t, i, obs, tout);
        const cmd = ruleCmd(i, t, true);
        st.ac = cmd.ac;
        st.lights = cmd.lights;
        brain.commit(i, obs, cmd.ac, tout);
        stepRoom(ROOM_CFG[i], st, t, people, tout, sc);
      }
      if ((t + 1) % TICKS_PER_DAY === 0) {
        const d = (t + 1) / TICKS_PER_DAY;
        this.progress = (d / TRAIN_DAYS) * 0.4;
        this.progressLabel = `Gerando histórico de sensores: dia ${d}/${TRAIN_DAYS}`;
        onUpdate();
        await yieldUI();
      }
    }

    this.phase = "training";
    const n = brain.datasetX.length;
    this.trainSamples = n;
    const order = Array.from({ length: n }, (_, k) => k);
    for (let e = 0; e < EPOCH_LR.length; e++) {
      brain.occ.lr = EPOCH_LR[e];
      for (let k = n - 1; k > 0; k--) {
        const j = Math.floor(hash01(SEED, 71, e, k) * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      let lossSum = 0;
      let ok = 0;
      for (let k = 0; k < n; k++) {
        const idx = order[k];
        lossSum += brain.occ.learn(brain.datasetX[idx], brain.datasetY[idx], "treino");
        if (brain.occ.lastOk) ok++;
        if (k % 20000 === 19999) {
          this.progress = 0.4 + 0.6 * ((e + k / n) / EPOCH_LR.length);
          this.progressLabel = `Treinando o modelo de ocupação: época ${e + 1}/${EPOCH_LR.length}`;
          onUpdate();
          await yieldUI();
        }
      }
      this.epochs.push({ epoch: e + 1, loss: lossSum / n, acc: ok / n });
      onUpdate();
      await yieldUI();
    }

    brain.occ.lr = 0.02; // ao vivo, o modelo continua aprendendo com passo menor
    brain.mode = "online";
    brain.resetLive();
    this.series = [{ label: "início", manual: 0, rule: 0, ai: 0 }];
    this.progress = 1;
    this.progressLabel = "Modelo treinado";
    this.phase = "ready";
    onUpdate();
  }

  // ───────── Simulação ao vivo ─────────
  step(n: number) {
    if (this.phase !== "ready") return;
    for (let k = 0; k < n; k++) this.stepLive();
  }

  private stepLive() {
    const t = this.tick;
    const sc = this.scenario;
    const tout = outdoorTemp(t, sc);
    const people = ROOM_CFG.map((_, i) => truePeople(i, t, sc));
    const ai = this.worlds.ai;

    // IA: sensores → aprendizado → decisão → comando
    ROOM_CFG.forEach((_, i) => {
      const obs: Obs = { people: sensePeople(people[i], i, t), T: senseTemp(ai.rooms[i].T, i, t) };
      this.brain.observe(t, i, obs, tout);
      const { cmd, drafts } = this.brain.decide(t, i, obs, { ac: ai.rooms[i].ac, lights: ai.rooms[i].lights }, tout);
      ai.rooms[i].ac = cmd.ac;
      ai.rooms[i].lights = cmd.lights;
      this.brain.commit(i, obs, cmd.ac, tout);
      drafts.forEach((d) => this.log(d));
    });

    // Física + contabilidade dos 3 mundos (mesma agenda, mesmas pessoas, mesmo clima)
    (["manual", "rule", "ai"] as Ctl[]).forEach((ctl) => {
      const w = this.worlds[ctl];
      ROOM_CFG.forEach((cfg, i) => {
        const st = w.rooms[i];
        if (ctl !== "ai") {
          const cmd = ctl === "manual" ? manualCmd(i, t) : ruleCmd(i, t);
          st.ac = cmd.ac;
          st.lights = cmd.lights;
        }
        const tBefore = st.T;
        const r = stepRoom(cfg, st, t, people[i], tout, sc);
        w.totals.kwh += r.kwh;
        if (people[i] === 0 && !classExpected(i, t, sc)) w.totals.wasteKwh += r.kwh;
        if (people[i] > 0 && tBefore > TARGET_T + 2) w.totals.discomfortMin += TICK_MIN;
        if (ctl === "ai") this.lastKw[i] = r.kw;
      });
    });

    this.lastPeople = people;
    this.tick++;

    if (this.tick % 12 === 0) {
      const { weekday, min } = timeOf(this.tick);
      const r1 = (v: number) => Math.round(v * 10) / 10;
      this.series.push({
        label: `${WEEKDAY_NAMES[weekday - 1].slice(0, 3)} ${String(Math.floor(min / 60)).padStart(2, "0")}h`,
        manual: r1(this.worlds.manual.totals.kwh),
        rule: r1(this.worlds.rule.totals.kwh),
        ai: r1(this.worlds.ai.totals.kwh),
      });
      if (this.series.length > 200) this.series.shift();
    }
  }

  private log(d: DecisionDraft) {
    const cfg = ROOM_CFG[d.roomIdx];
    this.decisions.unshift({
      id: ++this.decisionId,
      tick: this.tick,
      clock: clockLabel(this.tick),
      roomId: cfg.id,
      roomName: cfg.name,
      action: d.action,
      trigger: d.trigger,
      reason: d.reason,
      probability: d.probability,
      savingKwh: d.savingKwh,
      anomaly: d.anomaly,
    });
    if (this.decisions.length > 150) this.decisions.length = 150;
  }

  // ───────── Cenários ─────────
  toggleHeat(): boolean {
    this.scenario.heatOffset = this.scenario.heatOffset > 0 ? 0 : 5;
    return this.scenario.heatOffset > 0;
  }

  toggleB201(): boolean {
    if (this.b201 < 0) return false;
    const f = this.scenario.failedAc;
    if (f.has(this.b201)) f.delete(this.b201);
    else f.add(this.b201);
    return f.has(this.b201);
  }

  /** Cancela, sem avisar a IA, a próxima aula (que começa em 20+ min). */
  cancelNextClass(): string | null {
    const { day } = timeOf(this.tick);
    let best: { ev: ClassEv; d: number; startTick: number } | null = null;
    for (let d = day; d <= day + 1; d++) {
      for (let i = 0; i < ROOM_CFG.length; i++) {
        for (const ev of eventsOf(i, (d % 7) + 1)) {
          const startTick = d * TICKS_PER_DAY + ev.start / TICK_MIN;
          if (startTick < this.tick + 4 || this.scenario.cancelled.has(`${d}:${ev.num}`)) continue;
          if (!best || startTick < best.startTick) best = { ev, d, startTick };
        }
      }
    }
    if (!best) return null;
    this.scenario.cancelled.add(`${best.d}:${best.ev.num}`);
    return `${best.ev.course} (${ROOM_CFG[best.ev.roomIdx].name}, ${clockLabel(best.startTick)})`;
  }

  // ───────── Estado para a interface ─────────
  snapshot(): LabSnapshot {
    const occ = this.brain.occ;
    const ai = this.worlds.ai;
    const live = this.phase === "ready";
    const totals = (w: WorldState): Totals => ({ ...w.totals });

    return {
      phase: this.phase,
      progress: this.progress,
      progressLabel: this.progressLabel,
      tick: this.tick,
      clock: clockLabel(this.tick),
      outdoor: outdoorTemp(this.tick, this.scenario),
      rooms: ROOM_CFG.map((cfg, i) => ({
        id: cfg.id,
        name: cfg.name,
        capacity: cfg.capacity,
        people: this.lastPeople[i],
        temp: ai.rooms[i].T,
        ac: ai.rooms[i].ac,
        lights: ai.rooms[i].lights,
        kw: this.lastKw[i],
        pOcc30: live ? this.brain.peek(i, this.tick, 30) : 0,
        aiFailed: this.brain.ctx[i].failed,
        realFailed: this.scenario.failedAc.has(i),
      })),
      totals: { manual: totals(this.worlds.manual), rule: totals(this.worlds.rule), ai: totals(ai) },
      decisions: this.decisions.slice(0, 40),
      series: [...this.series],
      epochs: [...this.epochs],
      scenario: {
        heat: this.scenario.heatOffset > 0,
        b201Broken: this.b201 >= 0 && this.scenario.failedAc.has(this.b201),
        cancelled: this.scenario.cancelled.size,
      },
      model: {
        steps: occ.steps,
        trainSamples: this.trainSamples,
        lossEma: occ.lossEma,
        accEma: occ.accEma,
        history: [...occ.history],
        calibration: occ.bins.map((b) => ({
          p: b.n ? b.sumP / b.n : 0,
          freq: b.n ? b.pos / b.n : 0,
          n: b.n,
        })),
        weights: FEATURE_NAMES.slice(0, 15).map((name, k) => ({ name, w: occ.clf.w[k] })),
        thermal: ROOM_CFG.map((cfg, i) => {
          const t = this.brain.ctx[i].thermal;
          return {
            id: cfg.id,
            a: t.a,
            b: t.b,
            c: t.c,
            trueA: cfg.a,
            trueB: cfg.b,
            trueC: cfg.cMax,
            mae: t.maeEma,
            n: t.n,
          };
        }),
      },
    };
  }
}