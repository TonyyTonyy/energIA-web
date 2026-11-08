import { format } from "date-fns";

import { consumptionToday } from "@/data/consumption";
import { aiDecisions } from "@/data/decisions";
import { MOCK_NOW, getRoomById, rooms } from "@/data/rooms";
import { savingsHistory } from "@/data/savings";
import { scheduleEvents } from "@/data/schedule";
import { AI_ACTION_LABEL, AI_TRIGGER_LABEL, ROOM_STATUS_LABEL, TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatBRL, formatKw, formatKwh, formatTemp, formatTime } from "@/lib/format";
import { summarize } from "@/lib/savings-utils";
import {
  MOCK_WEEKDAY,
  getAIPlan,
  getEventStatus,
  getTodayAIState,
  suggestRelocation,
} from "@/lib/schedule-utils";
import { DEFAULT_SIMULATION_INPUT, SEASON_LABEL, formatDuration, simulate } from "@/lib/simulation";
import type { Room } from "@/types";

/** Horário simulado das mensagens novas: 18:40 (MOCK_NOW) + N minutos. */
export function mockTimestamp(minutesAfterNow: number): string {
  const d = new Date(MOCK_NOW);
  d.setMinutes(d.getMinutes() + minutesAfterNow);
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
}

// ───────── Utilidades ─────────
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const has = (text: string, words: string[]) => words.some((w) => text.includes(w));
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const names = (list: Room[]) => list.map((r) => r.name).join(", ");

const sortedDecisions = [...aiDecisions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
const todayEvents = scheduleEvents.filter((e) => e.weekday === MOCK_WEEKDAY);

const SCHEDULING_WORDS = ["agendar", "marcar aula", "reservar", "cadastrar", "criar aula", "cancelar aula", "remarcar"];
const ISSUE_WORDS = ["problema", "falha", "defeito", "quebrad", "manutencao", "compressor", "chamado", "nao responde"];
const WHY_WORDS = ["por que", "porque", "motivo", "decis", "desligou", "ligou", "apagou", "acendeu", "manteve", "fez"];

function detectRoomId(t: string): string | null {
  const m = t.match(/\b([abc])-?(\d{3})\b/);
  if (!m) return null;
  const id = `${m[1].toUpperCase()}-${m[2]}`;
  return getRoomById(id) ? id : null;
}

/** "3 horas" → 3 · "1h30" → 1.5 · "45 min" → 0.75. Devolve null se não houver duração. */
function parseIdleHours(t: string): number | null {
  const compact = t.match(/(\d+)\s*h\s*(\d{2})\b/);
  if (compact) return clamp(Number(compact[1]) + Number(compact[2]) / 60, 0.5, 8);

  const h = t.match(/(\d+(?:[.,]\d+)?)\s*(?:horas?|hrs?|h)\b/);
  const m = t.match(/(\d+)\s*(?:minutos?|min)\b/);
  if (!h && !m) return null;

  const hours = h ? Number(h[1].replace(",", ".")) : 0;
  const minutes = m ? Number(m[1]) : 0;
  return clamp(hours + minutes / 60, 0.5, 8);
}

function equipmentLabel(room: Room): string {
  const parts: string[] = [];
  if (room.acStatus === "on") parts.push("ar ligado");
  if (room.lightsStatus === "on") parts.push("luzes acesas");
  return parts.join(" e ");
}

// ───────── Respostas ─────────
function schedulingScopeReply(): string {
  return [
    "O EnergIA não substitui o sistema de agendamento de aulas. Ele lê a agenda para decidir quando ligar e desligar os equipamentos, mas cadastrar, alterar ou cancelar aulas continua sendo feito no sistema acadêmico da faculdade.",
    "Na tela Agenda você consulta o que está programado e o que a IA fará antes de cada aula.",
  ].join("\n");
}

function commandReply(room: Room | undefined): string {
  const where = room ? `da ${room.name}` : "de cada sala";
  return [
    "Eu só consulto informações: não aciono equipamentos.",
    `O controle manual fica na página ${where}, em Salas. Ao ajustar lá, a IA sai do modo automático naquela sala até você reativá-lo.`,
  ].join("\n");
}

function simulationReply(room: Room | undefined, idle: number | null): string {
  const roomId = room && !room.hasIssue ? room.id : DEFAULT_SIMULATION_INPUT.roomId;
  const idleHours = idle ?? DEFAULT_SIMULATION_INPUT.idleHours;
  const d = simulate({ ...DEFAULT_SIMULATION_INPUT, roomId, idleHours });
  const idleLabel = formatDuration(d.input.idleHours);

  const headline =
    d.recommended === "turn_off"
      ? `Sim, compensa. Em ${idleLabel} sem aula, desligar e religar economiza ${formatKwh(d.savingKwh)} (${formatBRL(d.savingBRL)}).`
      : d.savingKwh > 0
        ? `Não compensa. Em ${idleLabel} sem aula, o melhor é manter o ar ligado: desligar gastaria ${formatKwh(d.savingKwh)} a mais.`
        : `Em ${idleLabel} sem aula a diferença é desprezível, então a IA mantém o ar ligado.`;

  const notes: string[] = [];
  if (room?.hasIssue) notes.push(`${room.name} está com o ar com falha, então usei a ${d.roomName} na simulação.`);
  if (idle === null) notes.push(`Como você não informou o tempo, considerei ${idleLabel}.`);

  return [
    headline,
    d.explanation,
    ...notes,
    `Premissas: ${d.roomName}, ${d.input.outsideTemperature} °C fora (${SEASON_LABEL[d.input.season]}). Teste outros cenários na tela Simulador.`,
  ].join("\n");
}

function issuesReply(): string {
  const broken = rooms.filter((r) => r.hasIssue);
  if (broken.length === 0) return "Nenhuma sala está com problema agora. Todos os equipamentos respondem normalmente.";

  const header =
    broken.length === 1 ? "Sim, 1 sala está com problema." : `Sim, ${broken.length} salas estão com problema.`;

  const blocks = broken.map((room) => {
    const lines = [`${room.name}: ${room.issueDescription ?? "falha no equipamento."}`];
    todayEvents
      .filter((e) => e.roomId === room.id && getEventStatus(e) === "upcoming")
      .forEach((event) => {
        const target = suggestRelocation(event);
        lines.push(
          target
            ? `A aula de ${event.course} (${event.start}) precisa ser remanejada. Sugestão da IA: ${target.name}, livre nesse horário e a ${formatTemp(target.temperature)}.`
            : `A aula de ${event.course} (${event.start}) precisa ser remanejada, mas não há sala livre com capacidade suficiente.`,
        );
      });
    return lines.join("\n");
  });

  return [
    header,
    ...blocks,
    "O chamado de manutenção pode ser aberto na página da sala e o remanejamento, na tela Agenda.",
  ].join("\n");
}

function roomSummaryReply(room: Room): string {
  const lines = [
    `${room.name} (${room.block}) · ${ROOM_STATUS_LABEL[room.status]}.`,
    `${room.occupancy}/${room.capacity} pessoas, ${formatTemp(room.temperature)} (alvo ${formatTemp(room.targetTemperature)}). Ar-condicionado ${room.acStatus === "on" ? "ligado" : "desligado"}, luzes ${room.lightsStatus === "on" ? "acesas" : "apagadas"}, consumo de ${formatKw(room.powerKw)}.`,
  ];
  if (room.hasIssue && room.issueDescription) lines.push(`Problema: ${room.issueDescription}`);
  if (room.nextClassAt) lines.push(`Próxima aula às ${room.nextClassAt}.`);

  const last = sortedDecisions.find((d) => d.roomId === room.id);
  if (last) {
    lines.push(`Última decisão da IA, às ${formatTime(last.timestamp)}: ${AI_ACTION_LABEL[last.action]}. ${last.reason}`);
  }
  return lines.join("\n");
}

function roomDecisionsReply(room: Room, t: string): string {
  const all = sortedDecisions.filter((d) => d.roomId === room.id);
  if (all.length === 0) {
    return `A IA ainda não tomou nenhuma decisão na ${room.name} hoje. Situação atual: ${ROOM_STATUS_LABEL[room.status]}.`;
  }

  const wantsAc = /\bar\b/.test(t) || t.includes("condicionado");
  const wantsLights = /\b(luz|luzes)\b/.test(t) || t.includes("ilumin");

  let list = all;
  if (wantsAc !== wantsLights) {
    const filtered = all.filter((d) =>
      wantsAc ? d.action.startsWith("ac_") || d.action.startsWith("keep_") : d.action.startsWith("lights_"),
    );
    if (filtered.length > 0) list = filtered;
  }

  const shown = list.slice(0, 3);
  return [
    `Decisões da IA hoje — ${room.name}:`,
    ...shown.map(
      (d) => `• ${formatTime(d.timestamp)} · ${AI_ACTION_LABEL[d.action]} (${AI_TRIGGER_LABEL[d.trigger]}): ${d.reason}`,
    ),
    list.length > shown.length
      ? `Há mais ${list.length - shown.length} no log completo, em Decisões da IA.`
      : "O histórico completo está na página da sala.",
  ].join("\n");
}

function consumptionReply(): string {
  const total = rooms.reduce((s, r) => s + r.powerKw, 0);
  const acOn = rooms.filter((r) => r.acStatus === "on").length;
  const lightsOn = rooms.filter((r) => r.lightsStatus === "on").length;
  const top = [...rooms].sort((a, b) => b.powerKw - a.powerKw)[0];

  return [
    `Agora o campus consome ${formatKw(total)} no total, com ${acOn} ar-condicionados e ${lightsOn} conjuntos de luzes ligados.`,
    `O maior consumo é da ${top.name}: ${formatKw(top.powerKw)}.`,
  ].join("\n");
}

function savingsReply(): string {
  const baseline = consumptionToday.reduce((s, p) => s + p.baselineKwh, 0);
  const actual = consumptionToday.reduce((s, p) => s + p.acKwh + p.lightsKwh, 0);
  const savedKwh = baseline - actual;
  const pct = baseline > 0 ? Math.round((savedKwh / baseline) * 100) : 0;
  const month = summarize(savingsHistory);

  return [
    `Hoje, até agora, o campus consumiu ${formatKwh(actual)} contra ${formatKwh(baseline)} que consumiria sem o sistema: economia de ${formatKwh(savedKwh)} (${formatBRL(savedKwh * TARIFF_BRL_PER_KWH)}), ${pct}% a menos.`,
    `Nos últimos ${month.days} dias foram ${formatKwh(month.savedKwh)} evitados, o que dá ${formatBRL(month.savedBRL)}. Os gráficos estão na tela Economia.`,
  ].join("\n");
}

function wasteReply(): string {
  const empty = rooms.filter((r) => r.status === "empty");
  const wasting = empty.filter((r) => r.acStatus === "on" || r.lightsStatus === "on");
  const preCooling = rooms.filter((r) => r.status === "scheduled" && r.acStatus === "on");

  const lines: string[] = [];
  if (wasting.length === 0) {
    lines.push(
      `Não. Das ${empty.length} salas vazias agora (${names(empty)}), nenhuma está com ar ou luzes ligados.`,
    );
  } else {
    lines.push(
      `Sim, ${wasting.length} ${wasting.length === 1 ? "sala vazia está" : "salas vazias estão"} com equipamento ligado: ${wasting
        .map((r) => `${r.name} (${equipmentLabel(r)})`)
        .join(", ")}. A IA desliga assim que o sensor confirmar a ausência.`,
    );
  }
  if (preCooling.length > 0) {
    lines.push(
      `O ar ligado em ${names(preCooling)} é pré-resfriamento planejado para as aulas que começam em breve, não desperdício.`,
    );
  }
  return lines.join("\n");
}

function upcomingReply(): string {
  const upcoming = todayEvents
    .filter((e) => getEventStatus(e) === "upcoming")
    .sort((a, b) => a.start.localeCompare(b.start) || a.roomId.localeCompare(b.roomId));
  const ongoing = todayEvents.filter((e) => getEventStatus(e) === "ongoing").length;

  if (upcoming.length === 0) return `Não há mais aulas começando hoje. ${ongoing} em andamento.`;

  const lines = upcoming.map((event) => {
    const roomName = getRoomById(event.roomId)?.name ?? event.roomId;
    const state = getTodayAIState(event);
    const plan = getAIPlan(event);

    let note: string;
    if (state === "blocked") note = "ar com falha, turma precisa ser remanejada";
    else if (plan.kind === "keep_on") note = "ar mantido ligado";
    else if (state === "started") note = `ar ligado às ${plan.at}`;
    else note = `ar liga às ${plan.at}`;

    return `• ${event.start} · ${roomName} · ${event.course} (${note})`;
  });

  return [
    `Ainda hoje começam ${upcoming.length} aulas (${ongoing} estão em andamento):`,
    ...lines,
    "A grade completa está na tela Agenda.",
  ].join("\n");
}

function patternsReply(): string {
  return [
    "Os principais padrões que a IA aprendeu:",
    "• Às sextas à noite, A-201, B-102 e C-202 ficam sem uso: ar e luzes são desligados sem esperar o sensor.",
    "• Com mais de 1h30 sem aula, desligar e religar compensa. Abaixo disso, manter ligado é mais barato.",
    "• Nas aulas noturnas a turma sai cerca de 12 min antes do fim: a IA desliga após 10 min sem presença.",
    "• No verão as salas levam cerca de 8 min a mais para chegar a 23 °C, então o ar é religado mais cedo.",
    "• Cada sala tem a sua antecedência de pré-resfriamento, de 35 a 45 min.",
    "Os detalhes estão na aba Padrões aprendidos, em Decisões da IA.",
  ].join("\n");
}

function occupancyReply(): string {
  const occupied = rooms.filter((r) => r.status === "occupied");
  const scheduled = rooms.filter((r) => r.status === "scheduled").length;
  const empty = rooms.filter((r) => r.status === "empty").length;
  const issue = rooms.filter((r) => r.status === "issue").length;
  const people = rooms.reduce((s, r) => s + r.occupancy, 0);

  return [
    `Agora ${occupied.length} de ${rooms.length} salas estão ocupadas, com ${people} pessoas detectadas pelos sensores. ${scheduled} têm aula em breve, ${empty} estão vazias e ${issue} com problema.`,
    ...occupied.map((r) => `• ${r.name}: ${r.occupancy}/${r.capacity} pessoas`),
  ].join("\n");
}

function recentDecisionsReply(): string {
  return [
    "As últimas decisões da IA:",
    ...sortedDecisions.slice(0, 3).map((d) => {
      const roomName = getRoomById(d.roomId)?.name ?? d.roomId;
      return `• ${formatTime(d.timestamp)} · ${roomName} · ${AI_ACTION_LABEL[d.action]}: ${d.reason}`;
    }),
    "O log completo, com filtros, está em Decisões da IA.",
  ].join("\n");
}

function helpReply(): string {
  return [
    "Posso consultar os dados do sistema e responder, por exemplo:",
    "• Quanto economizamos hoje?",
    "• Há salas vazias com equipamento ligado?",
    "• Quais salas estão com problema?",
    "• Quais aulas começam em breve?",
    "• Por que a IA desligou o ar da A-201?",
    "• Vale a pena desligar o ar por 3 horas?",
    "Não aciono equipamentos nem altero a agenda de aulas: sou só uma camada de consulta.",
  ].join("\n");
}

function fallbackReply(): string {
  return [
    "Ainda não sei responder a isso.",
    'Posso falar sobre economia, consumo, ocupação, salas com problema, próximas aulas e decisões da IA, ou simular se compensa desligar o ar em um intervalo (ex.: "vale a pena desligar o ar por 3 horas?").',
  ].join("\n");
}

// ───────── Roteador de intenção ─────────
export function getAssistantReply(input: string): string {
  const t = normalize(input);
  const roomId = detectRoomId(t);
  const room = roomId ? getRoomById(roomId) : undefined;
  const idle = parseIdleHours(t);

  if (has(t, SCHEDULING_WORDS)) return schedulingScopeReply();
  if (/\b(ligue|desligue|acenda|apague)\b/.test(t)) return commandReply(room);

  if (
    has(t, ["compensa", "vale a pena", "desligar e religar", "manter ligado"]) ||
    (/\bdesligar\b/.test(t) && idle !== null)
  ) {
    return simulationReply(room, idle);
  }

  if (has(t, ISSUE_WORDS)) return room ? roomSummaryReply(room) : issuesReply();
  if (room) return has(t, WHY_WORDS) ? roomDecisionsReply(room, t) : roomSummaryReply(room);

  if (has(t, ["consumo", "consumindo", "consome", "kw", "potencia"])) return consumptionReply();
  if (has(t, ["economi", "poupou", "gasto", "reais", "r$", "quanto"])) return savingsReply();
  if (has(t, ["vazia", "vazias", "desperdicio", "desperdicando", "esquecid"])) return wasteReply();
  if (has(t, ["aprendeu", "aprendiz", "padrao", "padroes"])) return patternsReply();
  if (has(t, ["aula", "aulas", "agenda", "comeca", "comecam", "proxima", "proximas", "resfri", "liga o ar"])) {
    return upcomingReply();
  }
  if (has(t, ["ocupad", "ocupacao", "pessoas", "presenca"])) return occupancyReply();
  if (has(t, ["decisao", "decisoes", "ultima", "recente", "ia fez"])) return recentDecisionsReply();

  const isGreeting = /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite)\b/.test(t);
  if (isGreeting || has(t, ["ajuda", "o que voce faz", "o que voce pode", "consegue fazer"])) return helpReply();

  return fallbackReply();
}