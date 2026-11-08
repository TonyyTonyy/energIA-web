"use client";

import Link from "next/link";
import { AlertTriangle, Clock, EllipsisVertical, Lightbulb, Pencil, Snowflake, Trash2, WifiOff } from "lucide-react";

import { RoomAgendaNote, RoomStateBadge } from "@/components/rooms/room-state-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { formatKw, formatTemp } from "@/lib/format";
import { floorLabel, hasSensors } from "@/lib/room-utils";
import { cn } from "@/lib/utils";
import type { Room } from "@/types";

interface RoomCardProps {
  room: Room;
  onEdit?: (room: Room) => void;
  onDelete?: (room: Room) => void;
}

export function RoomCard({ room, onEdit, onDelete }: RoomCardProps) {
  const sensors = hasSensors(room);
  const manageable = Boolean(onEdit || onDelete);

  const occupancyPct = room.capacity > 0 ? Math.round((room.occupancy / room.capacity) * 100) : 0;
  const diff = room.temperature - room.targetTemperature;
  const tempTone =
    room.status === "empty"
      ? "text-muted-foreground"
      : diff <= 1.5
        ? "text-success"
        : diff <= 5
          ? "text-warning"
          : "text-danger";

  const acOn = room.acStatus === "on";
  const lightsOn = room.lightsStatus === "on";

  return (
    <div className="relative">
      <Link
        href={`/salas/${room.id}`}
        className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="h-full gap-4 py-4 transition-colors group-hover:bg-accent/40">
          <CardContent className="space-y-4 px-4">
            <div className={cn("flex items-start justify-between gap-2", manageable && "pr-9")}>
              <div>
                <p className="font-medium leading-tight">{room.name}</p>
                <p className="text-xs text-muted-foreground">
                  {room.block} · {floorLabel(room.floor)}
                </p>
              </div>
              <RoomStateBadge room={room} />
            </div>

            {room.hasIssue && (
              <div className="flex gap-2 rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-2">{room.issueDescription}</span>
              </div>
            )}

            {sensors ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Temperatura</p>
                    <p className={cn("text-sm font-semibold", tempTone)}>{formatTemp(room.temperature)}</p>
                    <p className="text-[11px] text-muted-foreground">alvo {formatTemp(room.targetTemperature)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ocupação</p>
                    <p className="text-sm font-semibold">
                      {room.occupancy}/{room.capacity}
                    </p>
                    <Progress value={occupancyPct} className="mt-1.5 h-1.5" aria-label="Ocupação da sala" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Consumo</p>
                    <p className="text-sm font-semibold">{formatKw(room.powerKw)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t pt-3 text-xs">
                  <span
                    className={cn("inline-flex items-center gap-1", acOn ? "text-info" : "text-muted-foreground")}
                  >
                    <Snowflake className="size-3.5" aria-hidden />
                    Ar {acOn ? "ligado" : "desligado"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      lightsOn ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    <Lightbulb className="size-3.5" aria-hidden />
                    Luz {lightsOn ? "acesa" : "apagada"}
                  </span>
                  {room.nextClassAt && (
                    <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden />
                      {room.nextClassAt}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  <p>
                    Capacidade para {room.capacity} pessoas · alvo {formatTemp(room.targetTemperature)}
                  </p>
                  <RoomAgendaNote room={room} />
                </div>
                <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <WifiOff className="size-3.5" aria-hidden />
                  Sem sensores nem automação conectados
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Link>

      {manageable && (
        <div className="absolute right-2 top-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label={`Ações da ${room.name}`}>
                <EllipsisVertical className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onSelect={() => onEdit(room)}>
                  <Pencil className="size-4" aria-hidden />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onSelect={() => onDelete(room)}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}