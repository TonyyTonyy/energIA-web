"use client";

import { Activity } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { useAppData } from "@/components/layout/app-data-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  acKwh: { label: "Ar-condicionado", color: "var(--chart-1)" },
  lightsKwh: { label: "Iluminação", color: "var(--chart-3)" },
  baselineKwh: { label: "Sem o EnergIA", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function ConsumptionChart({ className }: { className?: string }) {
  const { consumptionToday } = useAppData();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Consumo ao longo do dia</CardTitle>
        <CardDescription>
          kWh por hora: com o EnergIA (áreas) versus o cenário sem o sistema (linha tracejada)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {consumptionToday.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sem dados de consumo"
            description="O consumo aparece quando houver medidores conectados, ou com os dados simulados ativados."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ComposedChart data={consumptionToday} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="acKwh"
                type="monotone"
                stackId="actual"
                stroke="var(--color-acKwh)"
                fill="var(--color-acKwh)"
                fillOpacity={0.35}
              />
              <Area
                dataKey="lightsKwh"
                type="monotone"
                stackId="actual"
                stroke="var(--color-lightsKwh)"
                fill="var(--color-lightsKwh)"
                fillOpacity={0.35}
              />
              <Line
                dataKey="baselineKwh"
                type="monotone"
                stroke="var(--color-baselineKwh)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}