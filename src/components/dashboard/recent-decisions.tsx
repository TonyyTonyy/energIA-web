"use client";

import Link from "next/link";
import {
  BrainCircuit,
  Check,
  Lightbulb,
  LightbulbOff,
  Minus,
  PowerOff,
  Snowflake,
  type LucideIcon,
} from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_ACTION_LABEL, AI_TRIGGER_LABEL } from "@/lib/constants";
import { formatKwh, formatTime } from "@/lib/format";
import type { AIAction } from "@/types";

const ACTION_ICON: Record<AIAction, LucideIcon> = {
  ac_on: Snowflake,
  ac_off: PowerOff,
  lights_on: Lightbulb,
  lights_off: LightbulbOff,
  keep_on: Check,
  keep_off: Minus,
};

export function RecentDecisions({ className }: { className?: string }) {
  const { decisions, getRoomById } = useAppData();
  const recent = [...decisions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Decisões recentes da IA</CardTitle>
        <CardDescription>O que o sistema decidiu e por quê</CardDescription>
        <CardAction>
          <Link href="/decisoes-ia" className="text-sm font-medium text-primary hover:underline">
            Ver todas
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="Nenhuma decisão ainda"
            description="As decisões da IA aparecem aqui quando o sistema estiver controlando as salas, ou com os dados simulados ativados."
          />
        ) : (
          <ul className="space-y-4">
            {recent.map((decision) => {
              const Icon = ACTION_ICON[decision.action];
              const roomName = getRoomById(decision.roomId)?.name ?? decision.roomId;
              return (
                <li key={decision.id} className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {roomName} · {AI_ACTION_LABEL[decision.action]}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTime(decision.timestamp)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{decision.reason}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {AI_TRIGGER_LABEL[decision.trigger]}
                      </Badge>
                      {decision.estimatedSavingKwh > 0 && (
                        <span className="text-xs text-success">
                          economia de {formatKwh(decision.estimatedSavingKwh)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}