"use client";

import { CalendarDays, Clock, DoorOpen, PiggyBank, Power, WifiOff, Zap } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { StatCard } from "@/components/shared/stat-card";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatBRL, formatKwh } from "@/lib/format";
import { hasSensors } from "@/lib/room-utils";
import { describeDay, getEventStatus, getNextStart, getRoomAgendaState } from "@/lib/schedule-utils";
import { formatDuration } from "@/lib/simulation";

/** Sem sensores, os indicadores vêm da agenda cadastrada. */
function AgendaKpis() {
  const { rooms, scheduleEvents, scheduleCtx: ctx } = useAppData();

  const kinds = rooms.map((r) => getRoomAgendaState(r.id, ctx).kind);
  const inClass = kinds.filter((k) => k === "in_class").length;
  const soon = kinds.filter((k) => k === "soon").length;
  const free = kinds.length - inClass - soon;

  const today =
    ctx.clock.weekday === null ? [] : scheduleEvents.filter((e) => e.weekday === ctx.clock.weekday);
  const ongoing = today.filter((e) => getEventStatus(e, ctx) === "ongoing").length;
  const upcoming = today.filter((e) => getEventStatus(e, ctx) === "upcoming").length;

  const next = getNextStart(ctx);
  const nextHint = next
    ? `${next.dayOffset === 0 ? `em ${formatDuration(next.minutesUntil / 60)}` : describeDay(next.dayOffset, next.weekday)} · ${next.count} ${next.count === 1 ? "aula começa" : "aulas começam"} nesse horário`
    : "Sem aulas cadastradas";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Salas em aula (agenda)"
        value={`${inClass} de ${rooms.length}`}
        hint={`${soon} com aula em breve · ${free} sem aula agora`}
        icon={DoorOpen}
        tone="success"
      />
      <StatCard
        title="Aulas hoje"
        value={String(today.length)}
        hint={
          ctx.clock.weekday === null ? "Domingo, sem aulas" : `${ongoing} em andamento · ${upcoming} ainda hoje`
        }
        icon={CalendarDays}
        tone="info"
      />
      <StatCard title="Próximo início" value={next?.time ?? "—"} hint={nextHint} icon={Clock} tone="warning" />
      <StatCard
        title="Sensores conectados"
        value={`0 de ${rooms.length}`}
        hint="Conecte sensores para ver ocupação, consumo e economia"
        icon={WifiOff}
      />
    </div>
  );
}

export function KpiCards() {
  const { rooms, consumptionToday } = useAppData();

  // Só as salas com sensor entram nas contagens de ocupação, equipamentos e consumo.
  const monitored = rooms.filter(hasSensors);
  if (monitored.length === 0) return <AgendaKpis />;

  const unmonitored = rooms.length - monitored.length;

  const occupied = monitored.filter((r) => r.status === "occupied").length;
  const scheduled = monitored.filter((r) => r.status === "scheduled").length;
  const empty = monitored.filter((r) => r.status === "empty").length;

  const acOn = monitored.filter((r) => r.acStatus === "on").length;
  const lightsOn = monitored.filter((r) => r.lightsStatus === "on").length;
  const wasting = monitored.filter(
    (r) => r.status === "empty" && (r.acStatus === "on" || r.lightsStatus === "on"),
  ).length;

  const powerKw = monitored.reduce((sum, r) => sum + r.powerKw, 0);
  const powerLabel = `${powerKw.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kW`;

  const hasConsumption = consumptionToday.length > 0;
  const baseline = consumptionToday.reduce((s, p) => s + p.baselineKwh, 0);
  const actual = consumptionToday.reduce((s, p) => s + p.acKwh + p.lightsKwh, 0);
  const savedKwh = baseline - actual;
  const savedBRL = savedKwh * TARIFF_BRL_PER_KWH;
  const savedPct = baseline > 0 ? Math.round((savedKwh / baseline) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Salas ocupadas"
        value={`${occupied} de ${monitored.length}`}
        hint={`${scheduled} com aula em breve · ${empty} vazias${unmonitored > 0 ? ` · ${unmonitored} sem sensor` : ""}`}
        icon={DoorOpen}
        tone="success"
      />
      <StatCard
        title="Equipamentos ligados"
        value={String(acOn + lightsOn)}
        hint={`${acOn} ar-condicionados · ${lightsOn} luzes · ${wasting} desperdício em sala vazia`}
        icon={Power}
        tone="info"
      />
      <StatCard
        title="Consumo agora"
        value={powerLabel}
        hint={`${monitored.length} salas monitoradas`}
        icon={Zap}
        tone="warning"
      />
      <StatCard
        title="Economia hoje"
        value={hasConsumption ? formatBRL(savedBRL) : "—"}
        hint={hasConsumption ? `${formatKwh(savedKwh)} evitados (${savedPct}%)` : "Sem medição de consumo ainda"}
        icon={PiggyBank}
        tone="default"
      />
    </div>
  );
}