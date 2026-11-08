"use client";

import { useMemo } from "react";
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
import type { Room } from "@/types";

const chartConfig = {
  temperature: { label: "Temperatura", color: "var(--chart-1)" },
  target: { label: "Temperatura alvo", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

// 12 pontos, de 15:00 a 18:40 (a cada 20 min). O último ponto é sempre a temperatura atual.
const POINTS = 12;
const START_MIN = 15 * 60;
const STEP_MIN = 20;
const NOISE = [0.2, -0.1, 0.3, 0, -0.2, 0.1, 0.2, -0.3, 0.1, 0, -0.1, 0];

const pad = (n: number) => String(n).padStart(2, "0");
const round1 = (n: number) => Math.round(n * 10) / 10;

function timeLabel(i: number) {
  const minutes = START_MIN + i * STEP_MIN;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function temperatureAt(room: Room, i: number): number {
  const last = POINTS - 1;
  const t = i / last;
  const now = room.temperature;
  const target = room.targetTemperature;
  const noise = NOISE[i] ?? 0;

  if (i === last) return now;

  // Sala em uso: temperatura oscilando perto do alvo
  if (room.status === "occupied") {
    return target + (now - target) * t + noise * (1 - t);
  }

  // Aula em breve com ar ligado: sala esquentou e o pré-resfriamento começou (~18:20)
  if (room.status === "scheduled" && room.acStatus === "on") {
    const peakIdx = 10;
    const peak = now + 1.2;
    const start = peak - 4;
    if (i <= peakIdx) return start + (peak - start) * (i / peakIdx);
    return peak + (now - peak) * ((i - peakIdx) / (last - peakIdx));
  }

  // Sala vazia / com problema: temperatura subindo aos poucos
  const start = Math.max(target, now - 4.5);
  return start + (now - start) * t + noise * 0.3 * (1 - t);
}

function buildSeries(room: Room) {
  return Array.from({ length: POINTS }, (_, i) => ({
    time: timeLabel(i),
    temperature: round1(temperatureAt(room, i)),
    target: room.targetTemperature,
  }));
}

export function RoomTemperatureChart({ room, className }: { room: Room; className?: string }) {
  const data = useMemo(() => buildSeries(room), [room]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Temperatura da sala</CardTitle>
        <CardDescription>Últimas horas, a cada 20 minutos · dados simulados</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
              domain={["dataMin - 1", "dataMax + 1"]}
              tickFormatter={(value: number) => `${Math.round(value)}°`}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="temperature"
              type="monotone"
              stroke="var(--color-temperature)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="target"
              type="monotone"
              stroke="var(--color-target)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}