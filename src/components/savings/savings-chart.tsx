"use client";

import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatShortDate, formatWeekdayDate } from "@/lib/savings-utils";
import type { SavingsPoint } from "@/types";

type View = "consumo" | "economia";

const chartConfig = {
  actualKwh: { label: "Com o EnergIA", color: "var(--chart-1)" },
  baselineKwh: { label: "Sem o EnergIA", color: "var(--muted-foreground)" },
  savedBRL: { label: "Economia (R$)", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SavingsChart({ data, className }: { data: SavingsPoint[]; className?: string }) {
  const [view, setView] = useState<View>("consumo");

  const chartData = useMemo(
    () => data.map((p) => ({ ...p, label: formatShortDate(p.date) })),
    [data],
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{view === "consumo" ? "Consumo diário" : "Economia diária"}</CardTitle>
        <CardDescription>
          {view === "consumo"
            ? "kWh por dia: com o EnergIA (área) versus o cenário sem o sistema (linha tracejada)"
            : "Quanto o sistema economizou em cada dia, em reais"}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(value) => {
              if (value) setView(value as View);
            }}
          >
            <ToggleGroupItem value="consumo">Consumo</ToggleGroupItem>
            <ToggleGroupItem value="economia">Economia</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          {view === "consumo" ? (
            <ComposedChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_value, payload) => {
                      const date = payload?.[0]?.payload?.date as string | undefined;
                      return date ? formatWeekdayDate(date) : "";
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="actualKwh"
                type="monotone"
                stroke="var(--color-actualKwh)"
                fill="var(--color-actualKwh)"
                fillOpacity={0.3}
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
          ) : (
            <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => `R$ ${value}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_value, payload) => {
                      const date = payload?.[0]?.payload?.date as string | undefined;
                      return date ? formatWeekdayDate(date) : "";
                    }}
                  />
                }
              />
              <Bar dataKey="savedBRL" fill="var(--color-savedBRL)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}