"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CalendarX,
  Clock,
  DoorOpen,
  GraduationCap,
  Info,
  Plus,
  SearchX,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";

import { useAppData } from "@/components/layout/app-data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleEventCard } from "@/components/schedule/schedule-event-card";
import {
  DEFAULT_SCHEDULE_FILTERS,
  ScheduleFilters,
  filterScheduleEvents,
  filterScheduleRooms,
  type ScheduleFiltersState,
  type ScheduleView,
} from "@/components/schedule/schedule-filters";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { useScheduleDialogs } from "@/hooks/use-schedule-dialogs";
import { WEEKDAY_LABEL } from "@/lib/constants";
import { formatTemp } from "@/lib/format";
import {
  describeDay,
  getEventStatus,
  getNextStart,
  getTodayAIState,
  suggestRelocation,
} from "@/lib/schedule-utils";
import { formatDuration } from "@/lib/simulation";
import type { ScheduleEvent, Weekday } from "@/types";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function RelocationBanner({ event }: { event: ScheduleEvent }) {
  const { scheduleCtx, getRoomById } = useAppData();
  const [requested, setRequested] = useState(false);
  const from = getRoomById(event.roomId);
  const target = suggestRelocation(event, scheduleCtx);

  function handleRelocate() {
    if (!target) return;
    setRequested(true);
    toast.success("Remanejamento solicitado (simulação)", {
      description: `${event.course} (${event.start}) vai de ${from?.name ?? event.roomId} para ${target.name}. Professor e alunos serão avisados.`,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger sm:flex-row sm:items-center">
      <AlertTriangle className="size-5 shrink-0" aria-hidden />
      <div className="flex-1 space-y-1 text-sm">
        <p className="font-medium">
          A aula de {event.course} ({event.start}) na {from?.name ?? event.roomId} precisa ser remanejada
        </p>
        <p>
          {from?.issueDescription}{" "}
          {target
            ? `Sugestão da IA: ${target.name} (${target.capacity} lugares, a ${formatTemp(target.temperature)}), sem aula nesse horário.`
            : "Nenhuma sala livre com capacidade suficiente nesse horário."}
        </p>
      </div>
      {target && (
        <Button variant="outline" size="sm" disabled={requested} onClick={handleRelocate}>
          {requested ? "Remanejamento solicitado" : `Remanejar para ${target.name}`}
        </Button>
      )}
    </div>
  );
}

export default function Page() {
  const { rooms, scheduleEvents, scheduleCtx: ctx, canEdit } = useAppData();
  const dialogs = useScheduleDialogs();

  const [filters, setFilters] = useState<ScheduleFiltersState>(DEFAULT_SCHEDULE_FILTERS);
  const [view, setView] = useState<ScheduleView>("day");
  const [day, setDay] = useState<Weekday>(() => ctx.clock.weekday ?? 1);

  const stats = useMemo(() => {
    const today =
      ctx.clock.weekday === null ? [] : scheduleEvents.filter((e) => e.weekday === ctx.clock.weekday);
    const ongoing = today.filter((e) => getEventStatus(e, ctx) === "ongoing");
    const upcoming = today.filter((e) => getEventStatus(e, ctx) === "upcoming");
    const states = upcoming.map((e) => getTodayAIState(e, ctx));

    return {
      todayCount: today.length,
      ongoing: ongoing.length,
      upcoming: upcoming.length,
      roomsWithClass: new Set(today.map((e) => e.roomId)).size,
      next: getNextStart(ctx),
      preCooling: states.filter((s) => s === "started").length,
      waiting: states.filter((s) => s === "waiting").length,
      blocked: states.filter((s) => s === "blocked").length,
      blockedEvents: upcoming.filter((e) => getTodayAIState(e, ctx) === "blocked"),
      courses: new Set(scheduleEvents.map((e) => e.course.toLowerCase())).size,
      teachers: new Set(scheduleEvents.map((e) => e.teacher.toLowerCase())).size,
    };
  }, [ctx, scheduleEvents]);

  const events = useMemo(() => filterScheduleEvents(scheduleEvents, filters, rooms), [scheduleEvents, filters, rooms]);
  const visibleRooms = useMemo(() => filterScheduleRooms(rooms, events, filters), [rooms, events, filters]);
  const dayList = useMemo(
    () =>
      events
        .filter((e) => e.weekday === day)
        .sort((a, b) => a.start.localeCompare(b.start) || a.roomId.localeCompare(b.roomId)),
    [events, day],
  );

  const { next } = stats;
  const isSunday = ctx.clock.weekday === null;
  const nextHint = next
    ? `${next.dayOffset === 0 ? `em ${formatDuration(next.minutesUntil / 60)}` : describeDay(next.dayOffset, next.weekday)} · ${next.count} ${next.count === 1 ? "aula começa" : "aulas começam"} nesse horário`
    : "Sem aulas cadastradas";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Aulas da semana e o que a IA faz antes de cada uma: quando o ar é religado para a sala estar confortável no início."
        actions={
          canEdit && rooms.length > 0 ? (
            <Button size="sm" onClick={dialogs.openCreate}>
              <Plus className="size-4" aria-hidden />
              Cadastrar aula
            </Button>
          ) : undefined
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Cadastre as salas primeiro"
          description="Cada aula acontece em uma sala. Cadastre as salas do campus e depois monte a agenda."
          action={
            <Link href="/salas" className={buttonVariants({ size: "sm" })}>
              Ir para Salas
            </Link>
          }
        />
      ) : scheduleEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma aula cadastrada"
          description="Cadastre as aulas de cada sala. O sistema avisa se a sala ou o professor já estiverem ocupados no horário."
          action={
            <Button size="sm" onClick={dialogs.openCreate}>
              <Plus className="size-4" aria-hidden />
              Cadastrar aula
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Aulas hoje"
              value={String(stats.todayCount)}
              hint={
                isSunday
                  ? "Domingo, sem aulas"
                  : `${stats.ongoing} em andamento · ${stats.upcoming} ainda hoje`
              }
              icon={CalendarDays}
              tone="info"
            />
            <StatCard
              title="Salas com aula hoje"
              value={`${stats.roomsWithClass} de ${rooms.length}`}
              hint={
                canEdit
                  ? `${rooms.length - stats.roomsWithClass} sem aula hoje`
                  : `${rooms.length - stats.roomsWithClass} sem aula: a IA mantém desligadas`
              }
              icon={DoorOpen}
              tone="success"
            />
            <StatCard
              title="Próximo início"
              value={next?.time ?? "—"}
              hint={nextHint}
              icon={Clock}
              tone="warning"
            />
            {canEdit ? (
              <StatCard
                title="Aulas cadastradas"
                value={String(scheduleEvents.length)}
                hint={`${plural(stats.courses, "disciplina", "disciplinas")} · ${plural(stats.teachers, "professor", "professores")}`}
                icon={GraduationCap}
              />
            ) : (
              <StatCard
                title="Pré-resfriando agora"
                value={String(stats.preCooling)}
                hint={`${stats.waiting} aguardando o horário · ${stats.blocked} bloqueada por falha`}
                icon={Snowflake}
              />
            )}
          </div>

          {stats.blockedEvents.map((event) => (
            <RelocationBanner key={event.id} event={event} />
          ))}

          <ScheduleFilters
            filters={filters}
            onChange={setFilters}
            view={view}
            onViewChange={setView}
            day={day}
            onDayChange={setDay}
            roomCount={visibleRooms.length}
            totalRooms={rooms.length}
            eventCount={events.length}
          />

          {visibleRooms.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nenhuma aula encontrada"
              description="Tente ajustar a busca ou remover algum filtro."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_SCHEDULE_FILTERS)}>
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <ScheduleGrid
              events={events}
              rooms={visibleRooms}
              view={view}
              day={day}
              onEdit={canEdit ? dialogs.openEdit : undefined}
            />
          )}

          {canEdit && visibleRooms.length > 0 && (
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                As faixas azuis tracejadas mostram quando a IA ligaria o ar. Elas valem como previsão: as salas
                cadastradas ainda não têm automação conectada. Na visão Semana, clique em uma aula para editar.
              </span>
            </p>
          )}

          {view === "day" && visibleRooms.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">
                  Aulas de {WEEKDAY_LABEL[day]}
                  {day === ctx.clock.weekday && " (hoje)"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {dayList.length} {dayList.length === 1 ? "aula" : "aulas"} e o que a IA vai fazer em cada uma
                </p>
              </div>

              {dayList.length === 0 ? (
                <EmptyState
                  icon={CalendarX}
                  title="Nenhuma aula neste dia"
                  description={
                    canEdit
                      ? "Use o botão Cadastrar aula para incluir aulas neste dia."
                      : "Sem aulas, a IA mantém ar-condicionado e luzes desligados."
                  }
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {dayList.map((event) => (
                    <ScheduleEventCard
                      key={event.id}
                      event={event}
                      onEdit={canEdit ? dialogs.openEdit : undefined}
                      onDelete={canEdit ? dialogs.openDelete : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {dialogs.element}
    </div>
  );
}