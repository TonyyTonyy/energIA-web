import { AlertTriangle, Lightbulb, Snowflake, Thermometer, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatKw, formatTemp } from "@/lib/format";
import type { LabRoomView } from "@/lib/ml/engine";
import { cn } from "@/lib/utils";

export function LabLiveRooms({ rooms, className }: { rooms: LabRoomView[]; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Salas sob controle da IA</CardTitle>
        <CardDescription>
          Equipamentos mockados reagindo às decisões. A barra mostra a probabilidade de ocupação daqui a 30 min prevista pelo modelo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => {
            const tone =
              r.people === 0 ? "text-muted-foreground" : r.temp <= 24.5 ? "text-success" : r.temp <= 26 ? "text-warning" : "text-danger";
            return (
              <div key={r.id} className="space-y-2 rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  {r.aiFailed ? (
                    <Badge variant="outline" className="gap-1 border-danger/30 bg-danger/10 text-danger">
                      <AlertTriangle className="size-3" aria-hidden />
                      Defeito detectado
                    </Badge>
                  ) : r.realFailed ? (
                    <Badge variant="outline" className="text-[10px]" title="Falha real do simulador, ainda não detectada pela IA">
                      falha oculta
                    </Badge>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className={cn("inline-flex items-center gap-1", tone)}>
                    <Thermometer className="size-3.5" aria-hidden />
                    {formatTemp(r.temp)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden />
                    {r.people}/{r.capacity}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Zap className="size-3.5" aria-hidden />
                    {formatKw(r.kw)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Snowflake className={cn("size-4", r.ac ? "text-info" : "text-muted-foreground/40")} aria-label={r.ac ? "Ar ligado" : "Ar desligado"} />
                  <Lightbulb className={cn("size-4", r.lights ? "text-warning" : "text-muted-foreground/40")} aria-label={r.lights ? "Luzes acesas" : "Luzes apagadas"} />
                  <div className="flex-1 space-y-0.5">
                    <Progress value={r.pOcc30 * 100} className="h-1.5" aria-label="Probabilidade de ocupação em 30 min" />
                  </div>
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{Math.round(r.pOcc30 * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}