import Link from "next/link";
import {
  Calculator,
  CalendarClock,
  Check,
  Lightbulb,
  LightbulbOff,
  Minus,
  PowerOff,
  Radio,
  Snowflake,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getRoomById } from "@/data/rooms";
import { AI_ACTION_LABEL, AI_TRIGGER_LABEL } from "@/lib/constants";
import { formatKwh, formatTime } from "@/lib/format";
import type { AIAction, AIDecision, AITrigger } from "@/types";

export const ACTION_ICON: Record<AIAction, LucideIcon> = {
  ac_on: Snowflake,
  ac_off: PowerOff,
  lights_on: Lightbulb,
  lights_off: LightbulbOff,
  keep_on: Check,
  keep_off: Minus,
};

export const TRIGGER_ICON: Record<AITrigger, LucideIcon> = {
  schedule: CalendarClock,
  sensor: Radio,
  pattern: Sparkles,
  energy_calc: Calculator,
};

export function DecisionCard({ decision }: { decision: AIDecision }) {
  const ActionIcon = ACTION_ICON[decision.action];
  const TriggerIcon = TRIGGER_ICON[decision.trigger];
  const room = getRoomById(decision.roomId);
  const confidencePct = Math.round(decision.confidence * 100);

  return (
    <Card className="h-full gap-4 py-4">
      <CardContent className="flex h-full flex-col gap-3 px-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ActionIcon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{AI_ACTION_LABEL[decision.action]}</p>
            <p className="text-xs text-muted-foreground">
              <Link href={`/salas/${decision.roomId}`} className="font-medium text-foreground hover:underline">
                {room?.name ?? decision.roomId}
              </Link>{" "}
              · {formatTime(decision.timestamp)}
            </p>
          </div>
        </div>

        <p className="flex-1 text-sm text-muted-foreground">{decision.reason}</p>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="gap-1">
              <TriggerIcon className="size-3" aria-hidden />
              {AI_TRIGGER_LABEL[decision.trigger]}
            </Badge>
            {decision.estimatedSavingKwh > 0 ? (
              <span className="text-xs font-medium text-success">
                economia de {formatKwh(decision.estimatedSavingKwh)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">sem economia direta</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Confiança</span>
              <span>{confidencePct}%</span>
            </div>
            <Progress value={confidencePct} className="h-1.5" aria-label="Confiança da decisão" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}