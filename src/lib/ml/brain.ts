import type { AIAction, AITrigger } from "@/types";
import type { Cmd } from "@/lib/ml/controllers";
import { HORIZONS, OccupancyModel, ThermalModel, occupancyFeatures } from "@/lib/ml/models";
import { ROOM_CFG, TARGET_T, TICK_MIN, eventsOf, hhmm, isOperating, timeOf } from "@/lib/ml/world";

export interface Obs {
  people: number;
  T: number;
}

export interface DecisionDraft {
  roomIdx: number;
  action: AIAction;
  trigger: AITrigger;
  reason: string;
  probability?: number;
  savingKwh?: number;
  anomaly?: boolean;
}

interface RoomCtx {
  vacantTicks: number;
  occTicks: number;
  prev: { T: number; people: number; ac: boolean; tout: number } | null;
  lastAcChange: number;
  lastLightsChange: number;
  failStreak: number;
  failed: boolean;
  failedAt: number;
  anomalyPending: boolean;
  trackNum: number;
  trackWd: number;
  trackPeak: number;
  keepLogged: string;
  pending: Map<number, number[][]>;
  thermal: ThermalModel;
}

const newCtx = (): RoomCtx => ({
  vacantTicks: 0,
  occTicks: 0,
  prev: null,
  lastAcChange: -99,
  lastLightsChange: -99,
  failStreak: 0,
  failed: false,
  failedAt: 0,
  anomalyPending: false,
  trackNum: -1,
  trackWd: 1,
  trackPeak: 0,
  keepLogged: "",
  pending: new Map(),
  thermal: new ThermalModel(),
});

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const f1 = (n: number) => n.toFixed(1).replace(".", ",");
const pct = (p: number) => `${Math.round(p * 100)}%`;
const fmtDur = (min: number) =>
  min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}`;

export class AIBrain {
  readonly occ = new OccupancyModel();
  readonly ctx: RoomCtx[] = ROOM_CFG.map(() => newCtx());
  mode: "collect" | "online" = "collect";
  datasetX: number[][] = [];
  datasetY: (0 | 1)[] = [];

  resetLive() {
    this.datasetX = [];
    this.datasetY = [];
    this.ctx.forEach((c) => {
      c.prev = null;
      c.pending.clear();
      c.vacantTicks = 0;
      c.occTicks = 0;
      c.lastAcChange = -99;
      c.lastLightsChange = -99;
      c.keepLogged = "";
      c.failed = false;
      c.failStreak = 0;
      c.anomalyPending = false;
      c.trackNum = -1;
    });
  }

  // ───────── Aprendizado (roda a cada tick, para cada sala) ─────────
  observe(tick: number, i: number, obs: Obs, tout: number) {
    const c = this.ctx[i];
    const { weekday, min } = timeOf(tick);

    // 1) rótulos que chegaram agora (previsões feitas h minutos atrás)
    const due = c.pending.get(tick);
    if (due) {
      c.pending.delete(tick);
      const y: 0 | 1 = obs.people > 0 ? 1 : 0;
      for (const x of due) {
        if (this.mode === "collect") {
          this.datasetX.push(x);
          this.datasetY.push(y);
        } else {
          this.occ.learn(x, y, "ao vivo");
        }
      }
    }

    // 2) contexto dos sensores
    if (obs.people > 0) {
      c.occTicks++;
      c.vacantTicks = 0;
    } else {
      c.vacantTicks++;
      c.occTicks = 0;
    }

    // 3) comparecimento: ao fim de cada aula, atualiza a taxa histórica daquela sala/dia
    const ev = eventsOf(i, weekday).find((e) => min >= e.start - 10 && min <= e.end);
    if (ev) {
      if (c.trackNum !== ev.num) {
        this.closeTrack(i);
        c.trackNum = ev.num;
        c.trackWd = weekday;
        c.trackPeak = 0;
      }
      c.trackPeak = Math.max(c.trackPeak, obs.people);
    } else {
      this.closeTrack(i);
    }

    // 4) modelo térmico
    this.learnThermal(i, obs, tick);

    // 5) novas previsões que serão avaliadas quando o futuro chegar
    if (isOperating(min) && (this.mode === "online" || tick % 4 === 0)) {
      for (const h of HORIZONS) {
        const x = occupancyFeatures(this.occ, i, tick, h, obs.people > 0, c.vacantTicks * TICK_MIN);
        const dueTick = tick + h / TICK_MIN;
        const list = c.pending.get(dueTick) ?? [];
        list.push(x);
        c.pending.set(dueTick, list);
      }
    }
  }

  private closeTrack(i: number) {
    const c = this.ctx[i];
    if (c.trackNum >= 0) {
      this.occ.updateAttend(i, c.trackWd, c.trackPeak >= 3 ? 1 : 0);
      c.trackNum = -1;
    }
  }

  private learnThermal(i: number, obs: Obs, tick: number) {
    const c = this.ctx[i];
    const p = c.prev;
    if (!p) return;
    const y = obs.T - p.T;
    const sat = p.ac && p.T > TARGET_T + 1.2; // ar resfriando em potência máxima
    const x = [p.tout - p.T, p.people, sat ? 1 : 0];

    // Detecção de anomalia: o modelo previa queda de temperatura e ela não aconteceu
    if (sat && c.thermal.c > 0.2 && !c.failed) {
      if (y > -0.08) {
        c.failStreak++;
        if (c.failStreak >= 3) {
          c.failed = true;
          c.failedAt = tick;
          c.anomalyPending = true;
        }
      } else {
        c.failStreak = 0;
      }
    }
    if (sat && c.failStreak > 0) return; // não aprende com amostras suspeitas
    if (!p.ac || sat) c.thermal.update(x, y); // com o termostato segurando a temperatura, o efeito não é identificável
  }

  commit(i: number, obs: Obs, ac: boolean, tout: number) {
    this.ctx[i].prev = { T: obs.T, people: obs.people, ac, tout };
  }

  // ───────── Planejamento com o modelo térmico aprendido ─────────
  private params(i: number) {
    const t = this.ctx[i].thermal;
    return { a: clamp(t.a, 0.002, 0.08), c: clamp(t.c, 0.15, 1.5) };
  }

  /** Quantos ticks o ar leva para levar a sala de T0 ao alvo. */
  private preCoolTicks(i: number, T0: number, tout: number): number {
    const { a, c } = this.params(i);
    let T = T0;
    let n = 0;
    while (T > TARGET_T + 0.05 && n < 48) {
      T = T + a * (tout - T) - c;
      n++;
    }
    return n;
  }

  /** Compara "manter ligado" × "desligar e religar a tempo", em kWh, com os parâmetros aprendidos. */
  private planGap(i: number, T: number, tout: number, startInMin: number) {
    const { a, c } = this.params(i);
    const cfg = ROOM_CFG[i];
    const leak = Math.max(0, a * (tout - TARGET_T));
    const load = clamp(leak / c, 0, 1);
    const keepKwh = (cfg.rated * (0.08 + 0.92 * load) * startInMin) / 60;
    const gapTicks = Math.floor(startInMin / TICK_MIN);
    let best = { d: 0, pre: this.preCoolTicks(i, T, tout) };
    for (let d = 1; d <= gapTicks; d++) {
      const Td = tout + (T - tout) * Math.pow(1 - a, d);
      const pre = this.preCoolTicks(i, Td, tout);
      if (d + pre + 1 <= gapTicks) best = { d, pre };
    }
    const offKwh = (cfg.rated * best.pre * TICK_MIN) / 60;
    return {
      keepKwh,
      offKwh,
      offTicks: best.d,
      preTicks: best.pre,
      beneficial: best.d >= 2 && keepKwh - offKwh > 0.15 && offKwh < keepKwh * 0.9,
    };
  }

  peek(i: number, tick: number, h: number): number {
    const c = this.ctx[i];
    return this.occ.predict(occupancyFeatures(this.occ, i, tick, h, c.occTicks > 0, c.vacantTicks * TICK_MIN));
  }

  // ───────── Decisão ─────────
  decide(tick: number, i: number, obs: Obs, cur: Cmd, tout: number): { cmd: Cmd; drafts: DecisionDraft[] } {
    const c = this.ctx[i];
    const cfg = ROOM_CFG[i];
    const { day, weekday, min } = timeOf(tick);
    const drafts: DecisionDraft[] = [];
    const push = (action: AIAction, trigger: AITrigger, reason: string, extra: Partial<DecisionDraft> = {}) => {
      drafts.push({ roomIdx: i, action, trigger, reason, ...extra });
    };
    let { ac, lights } = cur;

    if (!isOperating(min)) {
      if (ac) {
        ac = false;
        c.lastAcChange = tick;
        push("ac_off", "schedule", "Fora do horário de funcionamento (23:30 às 05:00): ar desligado.");
      }
      if (lights) {
        lights = false;
        c.lastLightsChange = tick;
        push("lights_off", "schedule", "Fora do horário de funcionamento: luzes apagadas.");
      }
      return { cmd: { ac, lights }, drafts };
    }

    if (c.anomalyPending) {
      c.anomalyPending = false;
      ac = false;
      c.lastAcChange = tick;
      push(
        "ac_off",
        "sensor",
        `Anomalia: o modelo térmico previa queda de temperatura com o ar ligado e ela não aconteceu em 15 min. O ar da ${cfg.name} foi marcado como defeituoso e desligado para não gastar energia. Sugestão: abrir chamado e remanejar a turma.`,
        { anomaly: true },
      );
    }
    if (c.failed && tick - c.failedAt >= 36) {
      c.failed = false; // reteste a cada 3 h
      c.failStreak = 0;
    }

    const empty = obs.people === 0;
    const vacantMin = c.vacantTicks * TICK_MIN;
    const focus = eventsOf(i, weekday).find((e) => e.end > min && min <= e.start + 15);
    const startIn = focus ? Math.max(0, focus.start - min) : Infinity;
    const pocc = (h: number) =>
      this.occ.predict(occupancyFeatures(this.occ, i, tick, h, !empty, vacantMin));
    const p15 = pocc(15);
    const pAttend = focus
      ? startIn <= 80
        ? pocc(clamp(Math.round((startIn + 10) / 5) * 5, 15, 90))
        : this.occ.attendRate(i, weekday) * 0.95
      : 0;

    // ───── Ar-condicionado ─────
    if (!c.failed) {
      if (!empty) {
        if (!ac && c.occTicks >= 2 && obs.T > TARGET_T + 1.5 && tick - c.lastAcChange >= 3) {
          ac = true;
          c.lastAcChange = tick;
          push(
            "ac_on",
            "sensor",
            `${obs.people} pessoas na sala a ${f1(obs.T)} °C: ar ligado pelo sensor, porque o modelo não previu essa ocupação.`,
          );
        }
      } else if (ac) {
        const confirmed = vacantMin >= 10 || (p15 < 0.1 && vacantMin >= 5);
        if (confirmed && tick - c.lastAcChange >= 3) {
          if (!focus || pAttend < 0.4) {
            ac = false;
            c.lastAcChange = tick;
            const reason = focus
              ? `Sala vazia há ${vacantMin} min e o modelo prevê só ${pct(pAttend)} de chance de ocupação na aula das ${hhmm(focus.start)} (${focus.course}): ar desligado.`
              : p15 < 0.1
                ? `Sala vazia há ${vacantMin} min, sem mais aulas hoje e com ${pct(p15)} de chance de uso nos próximos 15 min (padrão aprendido): ar desligado.`
                : `Sala vazia há ${vacantMin} min e sem mais aulas hoje: ar desligado.`;
            push("ac_off", p15 < 0.1 ? "pattern" : "sensor", reason, { probability: focus ? pAttend : p15 });
          } else if (startIn >= 40) {
            const plan = this.planGap(i, obs.T, tout, Math.min(startIn, 480));
            if (plan.beneficial) {
              ac = false;
              c.lastAcChange = tick;
              push(
                "ac_off",
                "energy_calc",
                `Próxima aula (${focus.course}) às ${hhmm(focus.start)}, em ${fmtDur(startIn)}. Pelo modelo térmico aprendido, a sala fica ~${fmtDur(plan.offTicks * TICK_MIN)} sem ar e leva ${plan.preTicks * TICK_MIN} min para resfriar de novo. Desligar gasta ${f1(plan.offKwh)} kWh contra ${f1(plan.keepKwh)} kWh mantendo ligado.`,
                { savingKwh: plan.keepKwh - plan.offKwh, probability: pAttend },
              );
            } else {
              const key = `${day}:${focus.num}:keep`;
              if (c.keepLogged !== key) {
                c.keepLogged = key;
                push(
                  "keep_on",
                  "energy_calc",
                  `Próxima aula às ${hhmm(focus.start)}, em ${fmtDur(startIn)}. Desligar e religar gastaria ${f1(plan.offKwh)} kWh contra ${f1(plan.keepKwh)} kWh mantendo ligado: melhor manter.`,
                  { probability: pAttend },
                );
              }
            }
          }
        }
      } else if (focus) {
        const pre = this.preCoolTicks(i, obs.T, tout);
        if (pre > 0 && startIn / TICK_MIN <= pre + 1) {
          if (pAttend >= 0.4) {
            ac = true;
            c.lastAcChange = tick;
            push(
              "ac_on",
              "schedule",
              `Aula de ${focus.course} às ${hhmm(focus.start)} e sala a ${f1(obs.T)} °C. Pelo modelo térmico, resfriar até ${TARGET_T} °C leva ${pre * TICK_MIN} min: ar ligado agora. Chance de ocupação: ${pct(pAttend)}.`,
              { probability: pAttend },
            );
          } else {
            const key = `${day}:${focus.num}:skip`;
            if (c.keepLogged !== key) {
              c.keepLogged = key;
              push(
                "keep_off",
                "pattern",
                `Há aula de ${focus.course} agendada para ${hhmm(focus.start)}, mas o modelo prevê só ${pct(pAttend)} de chance de a sala ser usada (histórico de faltas nesse dia). Sem pré-resfriamento; se alguém chegar, o sensor liga o ar.`,
                { probability: pAttend },
              );
            }
          }
        }
      }
    }

    // ───── Luzes ─────
    if (!empty) {
      if (!lights) {
        lights = true;
        c.lastLightsChange = tick;
        push("lights_on", "sensor", `${obs.people} pessoas detectadas: luzes acesas.`);
      }
    } else if (lights) {
      const startingSoon = !!focus && startIn <= 10 && pAttend >= 0.4;
      const confirmed = vacantMin >= 10 || (p15 < 0.1 && vacantMin >= 5);
      if (!startingSoon && confirmed && tick - c.lastLightsChange >= 2) {
        lights = false;
        c.lastLightsChange = tick;
        push(
          "lights_off",
          p15 < 0.1 ? "pattern" : "sensor",
          p15 < 0.1
            ? `Sala vazia há ${vacantMin} min e o modelo prevê só ${pct(p15)} de chance de uso nos próximos 15 min: luzes apagadas.`
            : `Nenhuma presença há ${vacantMin} min: luzes apagadas.`,
          { probability: p15 },
        );
      }
    } else if (focus && startIn <= 5 && pAttend >= 0.4) {
      lights = true;
      c.lastLightsChange = tick;
      push("lights_on", "schedule", `Aula de ${focus.course} às ${hhmm(focus.start)}: luzes acesas.`, {
        probability: pAttend,
      });
    }

    return { cmd: { ac, lights }, drafts };
  }
}