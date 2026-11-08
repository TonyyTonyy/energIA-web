"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Clock,
  DoorOpen,
  EllipsisVertical,
  Pencil,
  Snowflake,
  Trash2,
  User,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasSensors } from "@/lib/room-utils";
import {
  EVENT_STATUS_LABEL,
  getAIPlan,
  getEventStatus,
  getTodayAIState,
  toMinutes,
  type AIPlan,
  type EventStatus,
  type ScheduleCtx,
} from "@/lib/schedule-utils";
import { formatDuration } from "@/lib/simulation";
import { cn } from "@/lib/utils";
import type { Room, ScheduleEvent } from "@/types";

const STATUS_STYLE: Record<EventStatus, string> = {
  done: "border-border bg-muted text-muted-foreground",
  ongoing: "border-success/30 bg-success/10 text-success",
  upcoming: "border-info/30 bg-info/10 text-info",
};

interface AIDescription {
  icon: LucideIcon;
  tone: string;
  text: string;
}

function describeAI(
  event: ScheduleEvent,
  plan: AIPlan,
  status: EventStatus | null,
  room: Room | undefined,
  ctx: ScheduleCtx,
): AIDescription {
  const target = `${(room?.targetTemperature ?? 23).toLocaleString("pt-BR")} °C`;

  if (room?.hasIssue) {
    return {
      icon: AlertTriangle,
      tone: "text-danger",
      text: "Ar-condicionado com falha: a IA não consegue climatizar esta sala. A turma precisa ser remanejada.",
    };
  }

  // Sala cadastrada, sem automação: mostra o que a IA faria quando houver
  if (room && !hasSensors(room)) {
    let text = "Sem automação conectada nesta sala.";
    if (status !== "ongoing" && status !== "done") {
      text =
        plan.kind === "keep_on"
          ? `Sem automação conectada. Com ela, a IA manteria o ar ligado: só ${formatDuration(plan.gapMinutes / 60)} desde a aula anterior nesta sala.`
          : `Sem automação conectada. Com ela, a IA ligaria o ar às ${plan.at} (${plan.minutes} min antes) para a sala estar a ${target} no início.`;
    }
    return { icon: WifiOff, tone: "text-muted-foreground", text };
  }

  if (status === "ongoing") {
    return {
      icon: Snowflake,
      tone: "text-info",
      text: "Aula em andamento com o ar ligado. A IA desliga os equipamentos quando os sensores indicarem sala vazia.",
    };
  }
  if (status === "done") {
    return {
      icon: Check,
      tone: "text-success",
      text: "Aula encerrada. A IA desligou ar e luzes depois que a sala esvaziou.",
    };
  }
  if (plan.kind === "keep_on") {
    return {
      icon: Snowflake,
      tone: "text-info",
      text: `Só ${formatDuration(plan.gapMinutes / 60)} desde a aula anterior nesta sala: a IA mantém o ar ligado, porque desligar não compensa.`,
    };
  }
  if (getTodayAIState(event, ctx) === "started") {
    return {
      icon: Snowflake,
      tone: "text-success",
      text: `A IA já ligou o ar às ${plan.at} (${plan.minutes} min antes) para a sala estar a ${target} no início da aula.`,
    };
  }
  return {
    icon: Snowflake,
    tone: "text-info",
    text: `A IA liga o ar às ${plan.at} (${plan.minutes} min antes da aula) para a sala estar a ${target} no início.`,
  };
}

interface ScheduleEventCardProps {
  event: ScheduleEvent;
  variant?: "full" | "compact";
  className?: string;
  onEdit?: (event: ScheduleEvent) => void;
  onDelete?: (event: ScheduleEvent) => void;
}

export function ScheduleEventCard({ event, variant = "full", className, onEdit, onDelete }: ScheduleEventCardProps) {
  const { scheduleCtx: ctx, getRoomById } = useAppData();
  const room = getRoomById(event.roomId);
  const status = getEventStatus(event, ctx);
  const hasIssue = room?.hasIssue ?? false;

  if (variant === "compact") {
    const compactClass = cn(
      "block w-full rounded-md border px-2 py-1 text-left text-xs transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      hasIssue
        ? "border-danger/30 bg-danger/10"
        : status === "ongoing"
          ? "border-success/30 bg-success/10"
          : "border-primary/20 bg-primary/5",
      className,
    );
    const content = (
      <>
        <span className="flex items-center gap-1 font-medium tabular-nums">
          {hasIssue && <AlertTriangle className="size-3 text-danger" aria-label="Sala com problema" />}
          {event.start}–{event.end}
        </span>
        <span className="block truncate text-muted-foreground">{event.course}</span>
      </>
    );
    const title = `${event.course} · ${event.teacher}`;

    if (onEdit) {
      return (
        <button type="button" title={`${title} (clique para editar)`} onClick={() => onEdit(event)} className={compactClass}>
          {content}
        </button>
      );
    }
    return (
      <Link href={`/salas/${event.roomId}`} title={title} className={compactClass}>
        {content}
      </Link>
    );
  }

  const plan = getAIPlan(event, ctx);
  const ai = describeAI(event, plan, status, room, ctx);
  const AIIcon = ai.icon;
  const manageable = Boolean(onEdit || onDelete);
  const statusLabel =
    status === "upcoming"
      ? `Começa em ${formatDuration((toMinutes(event.start) - ctx.clock.minutes) / 60)}`
      : status
        ? EVENT_STATUS_LABEL[status]
        : null;

  return (
    <Card className={cn("h-full gap-3 py-4", hasIssue && "border-danger/40", className)}>
      <CardContent className="flex h-full flex-col gap-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{event.course}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="size-3" aria-hidden />
              {event.teacher}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {status && statusLabel && (
              <Badge variant="outline" className={cn(STATUS_STYLE[status])}>
                {statusLabel}
              </Badge>
            )}
            {manageable && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7" aria-label={`Ações da aula ${event.course}`}>
                    <EllipsisVertical className="size-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onSelect={() => onEdit(event)}>
                      <Pencil className="size-4" aria-hidden />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onSelect={() => onDelete(event)} className="text-danger focus:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="size-3.5" aria-hidden />
            {event.start} – {event.end}
          </span>
          <Link
            href={`/salas/${event.roomId}`}
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            <DoorOpen className="size-3.5" aria-hidden />
            {room?.name ?? event.roomId}
          </Link>
        </div>

        <div className="mt-auto flex gap-2 rounded-md bg-muted/50 p-2.5 text-xs">
          <AIIcon className={cn("mt-0.5 size-3.5 shrink-0", ai.tone)} aria-hidden />
          <span className="text-muted-foreground">{ai.text}</span>
        </div>
      </CardContent>
    </Card>
  );
}