"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LabSnapshot } from "@/lib/ml/engine";
import { Activity } from "lucide-react";

const num = (v: number, d = 3) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const lossConfig = { loss: { label: "Log-loss (média móvel)", color: "var(--chart-1)" } } satisfies ChartConfig;
const calConfig = {
  observado: { label: "Frequência observada (%)", color: "var(--chart-1)" },
  ideal: { label: "Calibração perfeita (%)", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function LabMlPanel({ snap }: { snap: LabSnapshot }) {
  const m = snap.model;
  const calibration = m.calibration
    .filter((b) => b.n >= 5)
    .map((b) => ({
      x: `${Math.round(b.p * 100)}%`,
      observado: Math.round(b.freq * 100),
      ideal: Math.round(b.p * 100),
    }));
  const maxW = Math.max(0.001, ...m.weights.map((w) => Math.abs(w.w)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Por dentro do modelo</CardTitle>
        <CardDescription>
          {num(m.steps, 0)} atualizações de SGD ({num(m.trainSamples, 0)} amostras de treino) · log-loss {num(m.lossEma)} · acurácia {Math.round(m.accEma * 100)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="loss">
          <TabsList>
            <TabsTrigger value="loss">Aprendizado</TabsTrigger>
            <TabsTrigger value="cal">Calibração ao vivo</TabsTrigger>
            <TabsTrigger value="w">Pesos</TabsTrigger>
            <TabsTrigger value="thermal">Modelo térmico</TabsTrigger>
          </TabsList>

          <TabsContent value="loss" className="mt-4 space-y-4">
            <ChartContainer config={lossConfig} className="h-[240px] w-full">
              <LineChart data={m.history} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="step"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <YAxis tickLine={false} axisLine={false} width={40} domain={[0, "dataMax"]} tickFormatter={(v: number) => v.toFixed(2)} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line dataKey="loss" type="monotone" stroke="var(--color-loss)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground">
              A curva cai durante o treino. Depois do treino, os pontos novos vêm de previsões que o modelo fez antes de saber a resposta (avaliação prequential), então medem generalização de verdade.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Época</TableHead>
                  <TableHead className="text-right">Log-loss</TableHead>
                  <TableHead className="text-right">Acurácia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.epochs.map((e) => (
                  <TableRow key={e.epoch}>
                    <TableCell>{e.epoch}</TableCell>
                    <TableCell className="text-right">{num(e.loss)}</TableCell>
                    <TableCell className="text-right">{Math.round(e.acc * 1000) / 10}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="cal" className="mt-4">
            {calibration.length < 2 ? (
              <EmptyState icon={Activity} title="Ainda sem previsões avaliadas" description="Rode a simulação por algumas horas simuladas para acumular previsões." />
            ) : (
              <>
                <ChartContainer config={calConfig} className="h-[260px] w-full">
                  <LineChart data={calibration} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={36} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line dataKey="ideal" type="linear" stroke="var(--color-ideal)" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                    <Line dataKey="observado" type="linear" stroke="var(--color-observado)" strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ChartContainer>
                <p className="mt-2 text-xs text-muted-foreground">
                  Quando o modelo diz "70% de chance de ocupação", a sala deveria estar ocupada em ~70% desses casos. Quanto mais perto da linha tracejada, melhor calibrado.
                </p>
              </>
            )}
          </TabsContent>

          <TabsContent value="w" className="mt-4 space-y-2">
            {m.weights.map((w) => (
              <div key={w.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{w.name}</span>
                  <span className="tabular-nums text-muted-foreground">{num(w.w, 2)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${w.w >= 0 ? "bg-success" : "bg-danger"}`}
                    style={{ width: `${(Math.abs(w.w) / maxW) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              Verde aumenta a chance de ocupação, vermelho diminui. Os pesos por sala não aparecem aqui.
            </p>
          </TabsContent>

          <TabsContent value="thermal" className="mt-4 space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead className="text-right">a aprendido / real</TableHead>
                  <TableHead className="text-right">c (resfriamento) aprendido / real</TableHead>
                  <TableHead className="text-right">b (pessoas) aprendido / real</TableHead>
                  <TableHead className="text-right">Erro médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.thermal.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.id}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(t.a)} / {num(t.trueA)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(t.c)} / {num(t.trueC)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(t.b)} / {num(t.trueB)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(t.mae, 3)} °C</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              O simulador esconde os valores reais da IA e eles aparecem aqui só para auditoria. O parâmetro b (efeito das pessoas) é o mais difícil de aprender, porque o sinal é pequeno perto do ruído do sensor.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}