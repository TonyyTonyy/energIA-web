"use client";

import { Brain, Flame, FlaskConical, Pause, Play, RefreshCw, RotateCcw, UserX, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LabSpeed } from "@/hooks/use-lab";
import type { LabSnapshot } from "@/lib/ml/engine";
import { formatTemp } from "@/lib/format";

export function LabTrainCard({ snap, onTrain }: { snap: LabSnapshot; onTrain: () => void }) {
  const busy = snap.phase === "simulating" || snap.phase === "training";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5 text-primary" aria-hidden />
          1. Treinar o modelo
        </CardTitle>
        <CardDescription>
          Antes de decidir, a IA precisa aprender. O treino roda aqui no navegador, sem servidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Geramos 6 semanas de histórico de sensores (presença e temperatura) das 12 salas, com faltas e saídas antecipadas.</li>
          <li>Um modelo de regressão logística aprende a prever a ocupação de cada sala em 15 a 90 min, em 4 épocas de SGD.</li>
          <li>Um modelo térmico (mínimos quadrados recursivos) aprende como cada sala esquenta e resfria.</li>
          <li>A IA passa a decidir em tempo real e segue aprendendo com o que acontece.</li>
        </ol>
        {busy && (
          <div className="space-y-1.5">
            <Progress value={snap.progress * 100} aria-label="Progresso do treinamento" />
            <p className="text-xs text-muted-foreground">{snap.progressLabel}</p>
          </div>
        )}
        <Button onClick={onTrain} disabled={busy}>
          {busy ? <RefreshCw className="size-4 animate-spin" aria-hidden /> : <FlaskConical className="size-4" aria-hidden />}
          {busy ? "Treinando…" : "Treinar o modelo"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface LabControlsProps {
  snap: LabSnapshot;
  running: boolean;
  speed: LabSpeed;
  onSpeed: (s: LabSpeed) => void;
  onToggleRun: () => void;
  onHeat: () => void;
  onCancel: () => void;
  onBreak: () => void;
  onReset: () => void;
}

export function LabControls({
  snap,
  running,
  speed,
  onSpeed,
  onToggleRun,
  onHeat,
  onCancel,
  onBreak,
  onReset,
}: LabControlsProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onToggleRun}>
            {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {running ? "Pausar" : "Iniciar simulação"}
          </Button>

          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(speed)}
            onValueChange={(v) => {
              if (v) onSpeed(Number(v) as LabSpeed);
            }}
          >
            <ToggleGroupItem value="1">1×</ToggleGroupItem>
            <ToggleGroupItem value="4">4×</ToggleGroupItem>
            <ToggleGroupItem value="16">16×</ToggleGroupItem>
          </ToggleGroup>

          <Badge variant="outline" className="text-sm">
            {snap.clock}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Fora: {formatTemp(snap.outdoor)}
          </Badge>

          <Button variant="ghost" size="sm" className="ml-auto" onClick={onReset}>
            <RotateCcw className="size-4" aria-hidden />
            Reiniciar e retreinar
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Injetar cenário
          </span>
          <Button variant={snap.scenario.heat ? "default" : "outline"} size="sm" onClick={onHeat}>
            <Flame className="size-4" aria-hidden />
            Onda de calor (+5 °C)
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <UserX className="size-4" aria-hidden />
            Professor faltou (próxima aula)
          </Button>
          <Button variant={snap.scenario.b201Broken ? "outline" : "default"} size="sm" onClick={onBreak}>
            <Wrench className="size-4" aria-hidden />
            {snap.scenario.b201Broken ? "Consertar ar da B-201" : "Quebrar ar da B-201"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}