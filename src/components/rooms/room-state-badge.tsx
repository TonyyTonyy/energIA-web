"use client";

import { CalendarDays } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { hasSensors } from "@/lib/room-utils";
import { describeDay, getRoomAgendaState, type AgendaKind } from "@/lib/schedule-utils";
import { cn } from "@/lib/utils";
import type { Room } from "@/types";

const AGENDA_BADGE: Record<AgendaKind, { label: string; style: string }> = {
  in_class: { label: "Em aula", style: "border-info/30 bg-info/10 text-info" },
  soon: { label: "Aula em breve", style: "border-warning/30 bg-warning/10 text-warning" },
  free: { label: "Sem aula agora", style: "border-border bg-muted text-muted-foreground" },
};

/**
 * Com sensores: a situação medida (ocupada, vazia…).
 * Sem sensores: a situação pela agenda. Ela diz se há aula, não se há gente na sala.
 */
export function RoomStateBadge({ room, className }: { room: Room; className?: string }) {
  const { scheduleCtx } = useAppData();

  if (hasSensors(room)) return <StatusBadge status={room.status} className={className} />;

  const { kind } = getRoomAgendaState(room.id, scheduleCtx);
  const badge = AGENDA_BADGE[kind];

  return (
    <Badge
      variant="outline"
      title="Situação pela agenda: a sala não tem sensores para confirmar a presença"
      className={cn(badge.style, className)}
    >
      {badge.label}
    </Badge>
  );
}

/** Linha com a aula em andamento ou a próxima aula da sala, pela agenda. */
export function RoomAgendaNote({ room, className }: { room: Room; className?: string }) {
  const { scheduleCtx } = useAppData();
  const state = getRoomAgendaState(room.id, scheduleCtx);

  let text = "Nenhuma aula cadastrada";
  if (state.kind === "in_class" && state.event) {
    text = `Em aula: ${state.event.course} até ${state.event.end}`;
  } else if (state.event && state.dayOffset !== undefined) {
    text = `Próxima aula: ${state.event.course} às ${state.event.start} (${describeDay(state.dayOffset, state.event.weekday)})`;
  }

  return (
    <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
    </p>
  );
}