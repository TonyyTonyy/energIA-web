"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { formatBRL, formatKwh } from "@/lib/format";
import { percentLabel, splitByBlock, summarize } from "@/lib/savings-utils";
import type { SavingsPoint } from "@/types";

const chartConfig = {
  baselineKwh: { label: "Sem o EnergIA", color: "var(--muted-foreground)" },
  actualKwh: { label: "Com o EnergIA", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SavingsByBlock({ data, className }: { data: SavingsPoint[]; className?: string }) {
  const blocks = useMemo(() => splitByBlock(summarize(data)), [data]);

  const chartData = useMemo(
    () =>
      blocks.map((b) => ({
        block: b.block,
        baselineKwh: Math.round(b.baselineKwh),
        actualKwh: Math.round(b.actualKwh),
      })),
    [blocks],
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Economia por bloco</CardTitle>
        <CardDescription>Consumo com e sem o sistema em cada bloco do campus, no período selecionado</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="block" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={48} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="baselineKwh" fill="var(--color-baselineKwh)" fillOpacity={0.45} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actualKwh" fill="var(--color-actualKwh)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>

        <div className="space-y-5">
          {blocks.map((b) => (
            <div key={b.block} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {b.block}{" "}
                  <span className="text-xs font-normal text-muted-foreground">· {b.roomCount} salas</span>
                </p>
                <p className="text-sm font-semibold text-success">{formatBRL(b.savedBRL)}</p>
              </div>
              <Progress value={b.savedPct} className="h-1.5" aria-label={`Economia do ${b.block}`} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatKwh(b.savedKwh)} evitados</span>
                <span>{percentLabel(b.savedPct)} de economia</span>
              </div>
            </div>
          ))}

          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            O Bloco B tem o menor aproveitamento: o ar-condicionado da sala B-201 está com falha, e a IA não
            consegue atuar nessa sala até o reparo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}