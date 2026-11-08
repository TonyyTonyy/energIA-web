import type { ReactNode } from "react";
import { BrainCircuit, Info, PiggyBank, PowerOff, Snowflake, Thermometer, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatBRL, formatKw, formatKwh, formatTemp } from "@/lib/format";
import { SEASON_LABEL, formatDuration, type SimulationDetails } from "@/lib/simulation";
import { cn } from "@/lib/utils";

function OptionCard({
  title,
  subtitle,
  kwh,
  recommended,
}: {
  title: string;
  subtitle: string;
  kwh: number;
  recommended: boolean;
}) {
  return (
    <div className={cn("relative rounded-lg border p-4", recommended ? "border-primary bg-primary/5" : "bg-card")}>
      {recommended && <Badge className="absolute -top-2.5 right-3">Recomendado</Badge>}
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{formatKwh(kwh)}</p>
      <p className="text-xs text-muted-foreground">{formatBRL(kwh * TARIFF_BRL_PER_KWH)}</p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-lg font-semibold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function SimulatorResult({ details, className }: { details: SimulationDetails; className?: string }) {
  const { input } = details;
  const turnOff = details.recommended === "turn_off";
  const RecIcon = turnOff ? PowerOff : Snowflake;
  const idleLabel = formatDuration(input.idleHours);

  const bannerTitle = turnOff
    ? `Desligar agora e religar daqui a ${formatDuration(details.offHours)}`
    : "Manter o ar-condicionado ligado";

  const bannerText = turnOff
    ? details.preCoolMinutes > 0
      ? `O ar volta ${details.preCoolMinutes} min antes da aula para a sala estar a ${formatTemp(details.targetTemperature)} no início.`
      : "Não há necessidade de religar: a temperatura externa já está no alvo."
    : `Para um intervalo de ${idleLabel}, desligar e religar não compensa.`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Resultado da simulação</CardTitle>
        <CardDescription>
          {details.roomName} · {idleLabel} até a próxima aula · {input.outsideTemperature} °C fora ·{" "}
          {SEASON_LABEL[input.season]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RecIcon className="size-5" aria-hidden />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recomendação da IA
            </p>
            <p className="text-lg font-semibold leading-tight">{bannerTitle}</p>
            <p className="text-sm text-muted-foreground">{bannerText}</p>
          </div>
        </div>

        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <OptionCard
            title="Manter ligado"
            subtitle={`Ar ligado por ${idleLabel} · carga média de ${Math.round(details.maintainLoad * 100)}%`}
            kwh={details.keepOnKwh}
            recommended={!turnOff}
          />
          <OptionCard
            title="Desligar e religar"
            subtitle={
              details.preCoolMinutes > 0
                ? `Sem ar por ${formatDuration(details.offHours)} · pré-resfria ${details.preCoolMinutes} min`
                : `Sem ar por ${formatDuration(details.offHours)} · sem pré-resfriamento`
            }
            kwh={details.turnOffKwh}
            recommended={turnOff}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            icon={<PiggyBank className="size-3.5" aria-hidden />}
            label="Economia da recomendação"
            value={formatKwh(details.savingKwh)}
            hint={formatBRL(details.savingBRL)}
          />
          <Metric
            icon={<Timer className="size-3.5" aria-hidden />}
            label="Antecedência para religar"
            value={`${details.preCoolMinutes} min`}
            hint={turnOff ? "antes do início da aula" : "caso optasse por desligar"}
          />
          <Metric
            icon={<Thermometer className="size-3.5" aria-hidden />}
            label="Sala ao religar"
            value={formatTemp(details.restartTemperature)}
            hint={`alvo ${formatTemp(details.targetTemperature)}`}
          />
        </div>

        <div className="flex gap-3 rounded-lg bg-muted/50 p-4">
          <BrainCircuit className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium">Por que a IA decidiu assim</p>
            <p className="text-sm text-muted-foreground">{details.explanation}</p>
            {details.savingKwh > 0 && (
              <p className="text-sm text-success">
                Se essa situação se repetir em todos os dias úteis, a economia é de cerca de{" "}
                {formatBRL(details.monthlySavingBRL)} por mês nesta sala.
              </p>
            )}
          </div>
        </div>

        <p className="flex gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Modelo simplificado para demonstração: considera só o ar-condicionado (luzes apagadas nos dois
            cenários), potência estimada em {formatKw(details.acRatedKw)} pela capacidade da sala e tarifa de{" "}
            {formatBRL(TARIFF_BRL_PER_KWH)}/kWh.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}