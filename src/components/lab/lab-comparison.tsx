"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import type { Ctl, LabSnapshot } from "@/lib/ml/engine";
import { formatBRL, formatKwh } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartConfig = {
  manual: { label: "Manual (hoje)", color: "var(--muted-foreground)" },
  rule: { label: "Regra fixa (agenda)", color: "var(--chart-3)" },
  ai: { label: "IA (aprendizado)", color: "var(--chart-1)" },
} satisfies ChartConfig;

const CTLS: { key: Ctl; title: string; hint: string }[] = [
  { key: "manual", title: "Manual (hoje)", hint: "Liga antes da 1ª aula, desliga na ronda da noite" },
  { key: "rule", title: "Regra fixa (agenda)", hint: "Timer: liga 30 min antes, desliga no fim da aula" },
  { key: "ai", title: "IA (aprendizado)", hint: "Modelos aprendidos + sensores" },
];

const diff = (ai: number, other: number) => (other > 0 ? Math.round((1 - ai / other) * 100) : 0);

export function LabComparison({ snap }: { snap: LabSnapshot }) {
  const { manual, rule, ai } = snap.totals;
  const savedKwh = manual.kwh - ai.kwh;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {CTLS.map(({ key, title, hint }) => {
          const t = snap.totals[key];
          return (
            <Card key={key} className={cn(key === "ai" && "border-primary")}>
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{hint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{formatKwh(t.kwh)}</p>
                  <p className="text-xs text-muted-foreground">{formatBRL(t.kwh * TARIFF_BRL_PER_KWH)} de energia</p>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                  <div>
                    <p className="font-medium">{formatKwh(t.wasteKwh)}</p>
                    <p className="text-xs text-muted-foreground">desperdício (sala sem uso)</p>
                  </div>
                  <div>
                    <p className="font-medium">{t.discomfortMin} min</p>
                    <p className="text-xs text-muted-foreground">gente em sala acima de 25 °C</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        <span className="font-medium">IA × manual:</span> {diff(ai.kwh, manual.kwh)}% menos energia (
        {formatKwh(savedKwh)}, {formatBRL(savedKwh * TARIFF_BRL_PER_KWH)}) e{" "}
        {diff(ai.wasteKwh, manual.wasteKwh)}% menos desperdício. <span className="font-medium">IA × regra fixa:</span>{" "}
        {diff(ai.kwh, rule.kwh)}% de energia, {diff(ai.wasteKwh, rule.wasteKwh)}% de desperdício e{" "}
        {ai.discomfortMin} min de desconforto contra {rule.discomfortMin} min da regra.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consumo acumulado</CardTitle>
          <CardDescription>kWh acumulados das 12 salas desde o início da simulação, com a mesma agenda e o mesmo clima nos três cenários</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <LineChart data={snap.series} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} />
              <YAxis tickLine={false} axisLine={false} width={44} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line dataKey="manual" type="monotone" stroke="var(--color-manual)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="rule" type="monotone" stroke="var(--color-rule)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="ai" type="monotone" stroke="var(--color-ai)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}