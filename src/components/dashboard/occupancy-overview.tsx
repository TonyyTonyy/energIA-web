"use client";

import { CalendarClock, Users, WifiOff } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ROOM_STATUS_LABEL } from "@/lib/constants";
import { hasSensors } from "@/lib/room-utils";
import { getRoomAgendaState, type AgendaKind } from "@/lib/schedule-utils";
import type { RoomStatus } from "@/types";

const STATUS_ORDER: RoomStatus[] = ["occupied", "scheduled", "empty", "issue"];

const BAR_COLOR: Record<RoomStatus, string> = {
  occupied: "bg-success",
  scheduled: "bg-info",
  empty: "bg-muted-foreground/40",
  issue: "bg-danger",
};

const AGENDA_ROWS: { kind: AgendaKind; label: string; bar: string }[] = [
  { kind: "in_class", label: "Em aula", bar: "bg-info" },
  { kind: "soon", label: "Aula em breve", bar: "bg-warning" },
  { kind: "free", label: "Sem aula agora", bar: "bg-muted-foreground/40" },
];

/** Salas sem sensores: a situação vem só da agenda cadastrada. */
function AgendaOverview({ className }: { className?: string }) {
  const { rooms, scheduleCtx: ctx } = useAppData();

  const kindOf = new Map(rooms.map((r) => [r.id, getRoomAgendaState(r.id, ctx).kind]));
  const total = rooms.length;
  const blocks = Array.from(new Set(rooms.map((r) => r.block))).sort();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Situação pela agenda</CardTitle>
        <CardDescription>Calculada pelas aulas cadastradas, sem sensores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CalendarClock className="size-4" aria-hidden />
          </div>
          <p className="text-xs text-muted-foreground">
            A agenda diz se há aula, não se há gente na sala. A ocupação de verdade aparece quando houver sensores
            de presença.
          </p>
        </div>

        <div className="space-y-3">
          {AGENDA_ROWS.map((row) => {
            const count = rooms.filter((r) => kindOf.get(r.id) === row.kind).length;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={row.kind} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Por bloco</p>
          {blocks.map((block) => {
            const blockRooms = rooms.filter((r) => r.block === block);
            const count = (kind: AgendaKind) => blockRooms.filter((r) => kindOf.get(r.id) === kind).length;
            return (
              <div key={block} className="flex items-center justify-between gap-3 text-sm">
                <span>{block}</span>
                <span className="text-right text-muted-foreground">
                  {count("in_class")} em aula · {count("soon")} em breve · {count("free")} sem aula
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function OccupancyOverview({ className }: { className?: string }) {
  const { rooms } = useAppData();

  const monitored = rooms.filter(hasSensors);
  if (monitored.length === 0 && rooms.length > 0) return <AgendaOverview className={className} />;

  const unmonitored = rooms.length - monitored.length;
  const total = monitored.length;
  const people = monitored.reduce((sum, r) => sum + r.occupancy, 0);
  const blocks = Array.from(new Set(rooms.map((r) => r.block))).sort();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Ocupação</CardTitle>
        <CardDescription>
          {total === 0
            ? "Nenhuma sala com sensor"
            : `Situação das ${total} salas monitoradas${unmonitored > 0 ? ` · ${unmonitored} sem sensor` : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {total === 0 ? (
          <EmptyState
            icon={WifiOff}
            title="Sem sensores conectados"
            description="A ocupação aparece quando as salas tiverem sensores de presença, ou com os dados simulados ativados."
          />
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Users className="size-4" aria-hidden />
              </div>
              <div>
                <p className="text-xl font-semibold leading-none">{people}</p>
                <p className="text-xs text-muted-foreground">pessoas detectadas pelos sensores</p>
              </div>
            </div>

            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = monitored.filter((r) => r.status === status).length;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{ROOM_STATUS_LABEL[status]}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${BAR_COLOR[status]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Por bloco</p>
              {blocks.map((block) => {
                const blockRooms = rooms.filter((r) => r.block === block);
                const blockMonitored = blockRooms.filter(hasSensors);
                const occupied = blockMonitored.filter((r) => r.status === "occupied").length;
                const blockPeople = blockMonitored.reduce((s, r) => s + r.occupancy, 0);
                return (
                  <div key={block} className="flex items-center justify-between text-sm">
                    <span>{block}</span>
                    <span className="text-muted-foreground">
                      {blockMonitored.length === 0
                        ? `${blockRooms.length} ${blockRooms.length === 1 ? "sala" : "salas"} · sem sensor`
                        : `${occupied} de ${blockMonitored.length} salas · ${blockPeople} pessoas`}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}