"use client";

import { Search, X } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WEEKDAY_LABEL } from "@/lib/constants";
import { WEEKDAYS } from "@/lib/schedule-utils";
import type { Room, ScheduleEvent, Weekday } from "@/types";

export type ScheduleView = "day" | "week";

export interface ScheduleFiltersState {
  search: string;
  block: string; // "all" ou o nome do bloco
  roomId: string; // "all" ou o id da sala
}

export const DEFAULT_SCHEDULE_FILTERS: ScheduleFiltersState = {
  search: "",
  block: "all",
  roomId: "all",
};

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filterScheduleEvents(
  list: ScheduleEvent[],
  filters: ScheduleFiltersState,
  rooms: Room[],
): ScheduleEvent[] {
  const query = normalize(filters.search.trim());

  return list.filter((event) => {
    const room = rooms.find((r) => r.id === event.roomId);
    if (filters.block !== "all" && room?.block !== filters.block) return false;
    if (filters.roomId !== "all" && event.roomId !== filters.roomId) return false;
    if (query) {
      const haystack = normalize(`${event.course} ${event.teacher} ${room?.name ?? ""} ${event.roomId}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Salas que aparecem na grade: respeitam bloco/sala e, com busca ativa, só as que têm aula encontrada. */
export function filterScheduleRooms(
  roomList: Room[],
  filteredEvents: ScheduleEvent[],
  filters: ScheduleFiltersState,
): Room[] {
  const hasSearch = filters.search.trim() !== "";

  return roomList.filter((room) => {
    if (filters.block !== "all" && room.block !== filters.block) return false;
    if (filters.roomId !== "all" && room.id !== filters.roomId) return false;
    if (hasSearch && !filteredEvents.some((e) => e.roomId === room.id)) return false;
    return true;
  });
}

interface ScheduleFiltersProps {
  filters: ScheduleFiltersState;
  onChange: (filters: ScheduleFiltersState) => void;
  view: ScheduleView;
  onViewChange: (view: ScheduleView) => void;
  day: Weekday;
  onDayChange: (day: Weekday) => void;
  roomCount: number;
  totalRooms: number;
  eventCount: number;
}

export function ScheduleFilters({
  filters,
  onChange,
  view,
  onViewChange,
  day,
  onDayChange,
  roomCount,
  totalRooms,
  eventCount,
}: ScheduleFiltersProps) {
  const { rooms, clock } = useAppData();

  const isDirty = filters.search !== "" || filters.block !== "all" || filters.roomId !== "all";
  const blocks = Array.from(new Set(rooms.map((r) => r.block))).sort();
  const roomOptions = rooms.filter((room) => filters.block === "all" || room.block === filters.block);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Buscar disciplina, professor ou sala"
            aria-label="Buscar na agenda"
            className="pl-9"
          />
        </div>

        <Select value={filters.block} onValueChange={(block) => onChange({ ...filters, block, roomId: "all" })}>
          <SelectTrigger className="w-full lg:w-[160px]" aria-label="Filtrar por bloco">
            <SelectValue placeholder="Bloco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os blocos</SelectItem>
            {blocks.map((block) => (
              <SelectItem key={block} value={block}>
                {block}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.roomId} onValueChange={(roomId) => onChange({ ...filters, roomId })}>
          <SelectTrigger className="w-full lg:w-[170px]" aria-label="Filtrar por sala">
            <SelectValue placeholder="Sala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as salas</SelectItem>
            {roomOptions.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {roomCount} de {totalRooms} salas · {eventCount} aulas na semana
          </span>
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_SCHEDULE_FILTERS)}>
              <X className="size-4" aria-hidden />
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {view === "day" && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={String(day)}
              onValueChange={(value) => {
                if (value) onDayChange(Number(value) as Weekday);
              }}
            >
              {WEEKDAYS.map((d) => (
                <ToggleGroupItem key={d} value={String(d)} aria-label={WEEKDAY_LABEL[d]}>
                  {WEEKDAY_LABEL[d].slice(0, 3)}
                  {d === clock.weekday && <span className="ml-1 size-1.5 rounded-full bg-primary" aria-label="hoje" />}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}

          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(value) => {
              if (value) onViewChange(value as ScheduleView);
            }}
          >
            <ToggleGroupItem value="day">Dia</ToggleGroupItem>
            <ToggleGroupItem value="week">Semana</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}