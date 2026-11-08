"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEFAULT_SIMULATION_INPUT, SEASON_LABEL, formatDuration } from "@/lib/simulation";
import type { Room, SimulationInput } from "@/types";

const SEASONS = Object.keys(SEASON_LABEL) as SimulationInput["season"][];

/** Cenário inicial: a A-101 no protótipo, ou a primeira sala sem falha nos dados cadastrados. */
export function defaultsFor(rooms: Room[]): SimulationInput {
  const usable = rooms.filter((r) => !r.hasIssue);
  const roomId =
    usable.find((r) => r.id === DEFAULT_SIMULATION_INPUT.roomId)?.id ?? usable[0]?.id ?? rooms[0]?.id ?? "";
  return { ...DEFAULT_SIMULATION_INPUT, roomId };
}

function buildPresets(rooms: Room[], defaults: SimulationInput): { label: string; input: SimulationInput }[] {
  const usable = rooms.filter((r) => !r.hasIssue);
  // Usa a sala preferida do protótipo se existir; senão, distribui as salas disponíveis.
  const pick = (preferred: string, index: number) =>
    usable.find((r) => r.id === preferred)?.id ?? usable[index % Math.max(usable.length, 1)]?.id ?? defaults.roomId;

  return [
    {
      label: "Intervalo curto (45 min)",
      input: { roomId: pick("A-102", 1), idleHours: 0.75, outsideTemperature: 31, season: "primavera" },
    },
    { label: "Intervalo da tarde (3 h)", input: defaults },
    {
      label: "Sala vazia até a noite (6 h)",
      input: { roomId: pick("C-202", 2), idleHours: 6, outsideTemperature: 34, season: "verao" },
    },
    {
      label: "Noite de inverno (4 h)",
      input: { roomId: pick("B-102", 3), idleHours: 4, outsideTemperature: 24, season: "inverno" },
    },
  ];
}

interface SimulatorFormProps {
  value: SimulationInput;
  onChange: (value: SimulationInput) => void;
  rooms: Room[];
  defaults: SimulationInput;
  className?: string;
}

export function SimulatorForm({ value, onChange, rooms, defaults, className }: SimulatorFormProps) {
  const presets = buildPresets(rooms, defaults);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cenário</CardTitle>
        <CardDescription>Ajuste os dados e veja a decisão da IA mudar em tempo real</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cenários de exemplo
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button key={preset.label} variant="outline" size="sm" onClick={() => onChange(preset.input)}>
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sim-room">Sala</Label>
          <Select value={value.roomId} onValueChange={(roomId) => onChange({ ...value, roomId })}>
            <SelectTrigger id="sim-room" className="w-full">
              <SelectValue placeholder="Escolha a sala" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id} disabled={room.hasIssue}>
                  {room.name} · {room.block}
                  {room.hasIssue ? " (ar com falha)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sim-idle">Tempo até a próxima aula</Label>
            <span className="text-sm font-medium">{formatDuration(value.idleHours)}</span>
          </div>
          <Slider
            id="sim-idle"
            min={0.5}
            max={8}
            step={0.5}
            value={[value.idleHours]}
            onValueChange={([idleHours]) => onChange({ ...value, idleHours })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>30 min</span>
            <span>8h</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sim-outside">Temperatura externa</Label>
            <span className="text-sm font-medium">{value.outsideTemperature} °C</span>
          </div>
          <Slider
            id="sim-outside"
            min={18}
            max={40}
            step={1}
            value={[value.outsideTemperature]}
            onValueChange={([outsideTemperature]) => onChange({ ...value, outsideTemperature })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>18 °C</span>
            <span>40 °C</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Estação do ano</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            className="w-full"
            value={value.season}
            onValueChange={(season) => {
              if (season) onChange({ ...value, season: season as SimulationInput["season"] });
            }}
          >
            {SEASONS.map((season) => (
              <ToggleGroupItem key={season} value={season} className="flex-1">
                {SEASON_LABEL[season]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Button variant="ghost" size="sm" onClick={() => onChange(defaults)}>
          <RotateCcw className="size-4" aria-hidden />
          Restaurar valores padrão
        </Button>
      </CardContent>
    </Card>
  );
}