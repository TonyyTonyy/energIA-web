"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock, Thermometer, Users, WifiOff, Zap } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { RoomStateBadge } from "@/components/rooms/room-state-badge";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { formatKw, formatTemp } from "@/lib/format";
import { floorLabel, hasSensors } from "@/lib/room-utils";
import { MOCK_WEEKDAY, describeDay, getNextClassForRoom } from "@/lib/schedule-utils";
import { cn } from "@/lib/utils";
import type { Room } from "@/types";

export function RoomDetailHeader({ room, actions }: { room: Room; actions?: ReactNode }) {
  const { scheduleEvents, scheduleCtx, mockEnabled } = useAppData();
  const sensors = hasSensors(room);

  // Simulado: usa o campo nextClassAt da sala (sexta, 18:40). Real: calcula pela agenda cadastrada.
  const next = mockEnabled ? null : getNextClassForRoom(room.id, scheduleCtx);
  const nextEvent = mockEnabled
    ? room.nextClassAt
      ? scheduleEvents.find(
          (e) => e.roomId === room.id && e.weekday === MOCK_WEEKDAY && e.start === room.nextClassAt,
        )
      : undefined
    : next?.event;

  const nextValue = mockEnabled ? (room.nextClassAt ?? "—") : (next?.event.start ?? "—");
  const nextHint = nextEvent
    ? mockEnabled
      ? nextEvent.course
      : `${nextEvent.course} · ${describeDay(next?.dayOffset ?? 0, nextEvent.weekday)}`
    : mockEnabled
      ? "Sem aula agendada hoje"
      : "Nenhuma aula cadastrada nesta sala";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/salas"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para salas
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
            <RoomStateBadge room={room} />
          </div>
          {actions}
        </div>

        <p className="text-sm text-muted-foreground">
          {room.block} · {floorLabel(room.floor)} · capacidade para {room.capacity} pessoas
          {" · código "}
          {room.id}
        </p>
      </div>

      {!sensors && (
        <div className="flex gap-3 rounded-lg border border-info/30 bg-info/10 p-4 text-info">
          <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Sala sem sensores</p>
            <p>
              Esta sala foi cadastrada manualmente. Temperatura, ocupação e consumo aparecem quando houver sensores
              conectados.
            </p>
          </div>
        </div>
      )}

      {room.hasIssue && (
        <div className="flex gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Equipamento com problema</p>
            <p>{room.issueDescription}</p>
            {nextEvent && (
              <p>
                A aula de {nextEvent.course} ({nextEvent.start}) precisa ser remanejada para outra sala.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Temperatura"
          value={sensors ? formatTemp(room.temperature) : "—"}
          hint={sensors ? `alvo ${formatTemp(room.targetTemperature)}` : `sem sensor · alvo ${formatTemp(room.targetTemperature)}`}
          icon={Thermometer}
          tone="info"
        />
        <StatCard
          title="Ocupação"
          value={sensors ? `${room.occupancy}/${room.capacity}` : "—"}
          hint={sensors ? "pessoas detectadas pelo sensor" : `sem sensor · capacidade ${room.capacity}`}
          icon={Users}
          tone="success"
        />
        <StatCard
          title="Consumo agora"
          value={sensors ? formatKw(room.powerKw) : "—"}
          hint={sensors ? "ar-condicionado + iluminação" : "sem medidor conectado"}
          icon={Zap}
          tone="warning"
        />
        <StatCard title="Próxima aula" value={nextValue} hint={nextHint} icon={Clock} />
      </div>
    </div>
  );
}