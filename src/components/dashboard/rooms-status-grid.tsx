"use client";

import Link from "next/link";
import { AlertTriangle, Lightbulb, Snowflake, Thermometer, Users } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { RoomAgendaNote, RoomStateBadge } from "@/components/rooms/room-state-badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTemp } from "@/lib/format";
import { hasSensors } from "@/lib/room-utils";
import { cn } from "@/lib/utils";

export function RoomsStatusGrid({ className }: { className?: string }) {
  const { rooms } = useAppData();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Salas agora</CardTitle>
        <CardDescription>Clique em uma sala para ver os detalhes</CardDescription>
        <CardAction>
          <Link href="/salas" className="text-sm font-medium text-primary hover:underline">
            Ver todas
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const sensors = hasSensors(room);
            return (
              <Link
                key={room.id}
                href={`/salas/${room.id}`}
                className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{room.name}</span>
                  {room.hasIssue && <AlertTriangle className="size-4 text-danger" aria-label="Com problema" />}
                </div>

                <RoomStateBadge room={room} className="mt-2" />

                {sensors ? (
                  <>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Thermometer className="size-3.5" aria-hidden />
                        {formatTemp(room.temperature)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden />
                        {room.occupancy}/{room.capacity}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <span title={`Ar-condicionado ${room.acStatus === "on" ? "ligado" : "desligado"}`}>
                        <Snowflake
                          className={cn("size-4", room.acStatus === "on" ? "text-info" : "text-muted-foreground/40")}
                          aria-hidden
                        />
                      </span>
                      <span title={`Luzes ${room.lightsStatus === "on" ? "acesas" : "apagadas"}`}>
                        <Lightbulb
                          className={cn(
                            "size-4",
                            room.lightsStatus === "on" ? "text-warning" : "text-muted-foreground/40",
                          )}
                          aria-hidden
                        />
                      </span>
                      {room.nextClassAt && (
                        <span className="ml-auto text-xs text-muted-foreground">Aula às {room.nextClassAt}</span>
                      )}
                    </div>
                  </>
                ) : (
                                    <RoomAgendaNote room={room} className="mt-3" />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}