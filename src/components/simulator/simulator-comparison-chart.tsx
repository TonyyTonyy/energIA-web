"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { buildComparisonSeries, formatDuration, type SimulationDetails } from "@/lib/simulation";

const chartConfig = {
  keepOn: { label: "Manter ligado", color: "var(--chart-3)" },
  turnOff: { label: "Desligar e religar", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SimulatorComparisonChart({
  details,
  className,
}: {
  details: SimulationDetails;
  className?: string;
}) {
  const idle = details.input.idleHours;
  const data = useMemo(() => buildComparisonSeries(details), [details]);

  const ticks = useMemo(() => {
    const step = idle <= 2 ? 0.5 : idle <= 4 ? 1 : 2;
    const list: number[] = [];
    for (let t = 0; t <= idle + 1e-9; t += step) list.push(t);
    return list;
  }, [idle]);

  const showRestart = details.preCoolHours > 0.02 && details.offHours > 0.02;
  const turnOff = details.recommended === "turn_off";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Consumo acumulado até a aula</CardTitle>
        <CardDescription>
          kWh acumulados nas próximas {formatDuration(idle)}. As duas estratégias terminam com a sala em{" "}
          {details.targetTemperature.toLocaleString("pt-BR")} °C no início da aula.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data} margin={{ top: 20, left: 0, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              type="number"
              dataKey="hours"
              domain={[0, idle]}
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: number) => (value === 0 ? "Agora" : formatDuration(value))}
            />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_value, payload) => {
                    const hours = payload?.[0]?.payload?.hours as number | undefined;
                    if (hours === undefined) return "";
                    return hours === 0 ? "Agora" : `Daqui a ${formatDuration(hours)}`;
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {showRestart && (
              <ReferenceLine
                x={details.offHours}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: turnOff ? "Religa o ar" : "Religaria o ar",
                  position: "top",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
            )}
            <Line
              dataKey="keepOn"
              type="linear"
              stroke="var(--color-keepOn)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="turnOff"
              type="linear"
              stroke="var(--color-turnOff)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}