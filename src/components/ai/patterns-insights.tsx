import { Calculator, CalendarX, LogOut, Sparkles, Sun, Timer, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getRoomById } from "@/data/rooms";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatBRL, formatKwh } from "@/lib/format";

interface Pattern {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  roomIds: string[]; // vazio = todas as salas
  confidence: number; // 0–1
  evidence: string;
  weeklySavingKwh?: number;
  impactLabel?: string;
}

// Padrões aprendidos (mock), coerentes com as decisões de data/decisions.ts
const PATTERNS: Pattern[] = [
  {
    id: "pat-1",
    icon: CalendarX,
    title: "Sextas à noite sem uso",
    description:
      "Às sextas, depois das 17:00, estas salas não têm aula nem presença. A IA desliga o ar e as luzes sem esperar o sensor confirmar.",
    roomIds: ["A-201", "B-102", "C-202"],
    confidence: 0.88,
    evidence: "Observado em 11 das últimas 12 semanas",
    weeklySavingKwh: 9.6,
  },
  {
    id: "pat-2",
    icon: Calculator,
    title: "Intervalos longos: desligar compensa",
    description:
      "Com mais de ~1h30 sem aula, desligar e religar com pré-resfriamento gasta menos do que manter o ar ligado. Abaixo disso, manter ligado é mais barato.",
    roomIds: ["A-101", "A-102", "C-101"],
    confidence: 0.91,
    evidence: "Calculado sobre 86 intervalos nos últimos 90 dias",
    weeklySavingKwh: 22.4,
  },
  {
    id: "pat-3",
    icon: LogOut,
    title: "Turma sai antes do fim da aula",
    description:
      "Nas aulas noturnas, a sala esvazia em média 12 minutos antes do horário oficial. A IA desliga os equipamentos após 10 minutos sem presença.",
    roomIds: ["A-102", "B-101", "C-102"],
    confidence: 0.86,
    evidence: "Observado em 38 de 45 aulas noturnas",
    weeklySavingKwh: 6.3,
  },
  {
    id: "pat-4",
    icon: Sun,
    title: "Efeito da estação do ano",
    description:
      "No verão, as salas levam cerca de 8 minutos a mais para chegar a 23 °C. A IA antecipa o religamento nessa época para a aula começar confortável.",
    roomIds: [],
    confidence: 0.82,
    evidence: "Comparação entre estações nos últimos 90 dias",
    impactLabel: "Conforto no início das aulas",
  },
];

const PRE_COOL = [
  { roomId: "C-102", minutes: 45 },
  { roomId: "B-101", minutes: 40 },
  { roomId: "A-101", minutes: 40 },
  { roomId: "A-102", minutes: 35 },
  { roomId: "C-201", minutes: 35 },
];

const totalWeeklyKwh = PATTERNS.reduce((sum, p) => sum + (p.weeklySavingKwh ?? 0), 0);

export function PatternsInsights() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            A IA já aprendeu {PATTERNS.length + 1} padrões de uso do campus
          </p>
          <p className="text-sm text-muted-foreground">
            Economia projetada por esses padrões:{" "}
            <span className="font-medium text-success">
              {formatKwh(totalWeeklyKwh)} por semana ({formatBRL(totalWeeklyKwh * TARIFF_BRL_PER_KWH)})
            </span>
            . Os padrões se atualizam sozinhos conforme o histórico cresce.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PATTERNS.map((pattern) => {
          const Icon = pattern.icon;
          return (
            <Card key={pattern.id} className="gap-4 py-5">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight">{pattern.title}</CardTitle>
                    <CardDescription>{pattern.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {pattern.roomIds.length === 0 ? (
                    <Badge variant="secondary">Todas as salas</Badge>
                  ) : (
                    pattern.roomIds.map((id) => (
                      <Badge key={id} variant="secondary">
                        {id}
                      </Badge>
                    ))
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confiança do padrão</span>
                    <span>{Math.round(pattern.confidence * 100)}%</span>
                  </div>
                  <Progress
                    value={pattern.confidence * 100}
                    className="h-1.5"
                    aria-label="Confiança do padrão"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs">
                  <span className="text-muted-foreground">{pattern.evidence}</span>
                  <span className="shrink-0 font-medium text-success">
                    {pattern.weeklySavingKwh !== undefined
                      ? `${formatKwh(pattern.weeklySavingKwh)}/semana`
                      : pattern.impactLabel}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card className="gap-4 py-5 lg:col-span-2">
          <CardHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                <Timer className="size-4" aria-hidden />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base leading-tight">Antecedência de pré-resfriamento por sala</CardTitle>
                <CardDescription>
                  Quanto tempo cada sala leva, em média, para chegar a 23 °C. Salas maiores e mais quentes
                  recebem o ar ligado mais cedo.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {PRE_COOL.map(({ roomId, minutes }) => (
                <div key={roomId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{getRoomById(roomId)?.name ?? roomId}</span>
                    <span className="text-muted-foreground">{minutes} min</span>
                  </div>
                  <Progress
                    value={(minutes / 60) * 100}
                    className="h-1.5"
                    aria-label={`Pré-resfriamento da sala ${roomId}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}