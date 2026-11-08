"use client";

import { useState } from "react";
import { Bot, Lightbulb, Snowflake, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatTemp } from "@/lib/format";
import type { Room } from "@/types";

export function RoomEquipmentControls({ room }: { room: Room }) {
  const [auto, setAuto] = useState(true);
  const [acOn, setAcOn] = useState(room.acStatus === "on");
  const [lightsOn, setLightsOn] = useState(room.lightsStatus === "on");
  const [target, setTarget] = useState(room.targetTemperature);
  const [ticketOpened, setTicketOpened] = useState(false);

  // Qualquer ajuste manual tira a sala do modo automático da IA.
  function notify(message: string) {
    if (auto) {
      setAuto(false);
      toast.info(message, {
        description: "Controle manual ativado: a IA não altera esta sala até você reativar o modo automático.",
      });
    } else {
      toast.success(message);
    }
  }

  function handleAuto(checked: boolean) {
    setAuto(checked);
    if (checked) toast.success(`A IA reassumiu o controle de ${room.name}.`);
    else toast.info("Controle manual ativado.");
  }

  function handleOpenTicket() {
    setTicketOpened(true);
    toast.success("Chamado de manutenção aberto", {
      description: `${room.name}: ${room.issueDescription ?? "falha no equipamento"}`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controles</CardTitle>
        <CardDescription>Simulação: nenhum equipamento real é acionado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Bot className="size-4" aria-hidden />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="auto-switch" className="text-sm font-medium">
                Controle automático (IA)
              </Label>
              <p className="text-xs text-muted-foreground">
                {auto ? "A IA decide quando ligar e desligar." : "Modo manual: a IA não interfere nesta sala."}
              </p>
            </div>
          </div>
          <Switch id="auto-switch" checked={auto} onCheckedChange={handleAuto} />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Snowflake className="size-4 text-info" aria-hidden />
              <div className="space-y-0.5">
                <Label htmlFor="ac-switch" className="text-sm">
                  Ar-condicionado
                </Label>
                {room.hasIssue && (
                  <p className="text-xs text-danger">Equipamento com falha. Controle indisponível.</p>
                )}
              </div>
            </div>
            <Switch
              id="ac-switch"
              checked={acOn}
              disabled={room.hasIssue}
              onCheckedChange={(checked) => {
                setAcOn(checked);
                notify(checked ? "Ar-condicionado ligado" : "Ar-condicionado desligado");
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lightbulb className="size-4 text-warning" aria-hidden />
              <Label htmlFor="lights-switch" className="text-sm">
                Iluminação
              </Label>
            </div>
            <Switch
              id="lights-switch"
              checked={lightsOn}
              onCheckedChange={(checked) => {
                setLightsOn(checked);
                notify(checked ? "Luzes acesas" : "Luzes apagadas");
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="target-slider" className="text-sm">
                Temperatura alvo
              </Label>
              <span className="text-sm font-medium">{formatTemp(target)}</span>
            </div>
            <Slider
              id="target-slider"
              min={18}
              max={26}
              step={0.5}
              value={[target]}
              disabled={!acOn || room.hasIssue}
              onValueChange={([value]) => setTarget(value)}
              onValueCommit={([value]) => notify(`Temperatura alvo ajustada para ${formatTemp(value)}`)}
            />
          </div>
        </div>

        {room.hasIssue && (
          <>
            <Separator />
            <Button
              variant="outline"
              className="w-full"
              disabled={ticketOpened}
              onClick={handleOpenTicket}
            >
              <Wrench className="size-4" aria-hidden />
              {ticketOpened ? "Chamado aberto" : "Abrir chamado de manutenção"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}