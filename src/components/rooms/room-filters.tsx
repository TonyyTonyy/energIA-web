"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ROOM_STATUS_LABEL } from "@/lib/constants";
import { hasSensors } from "@/lib/room-utils";
import { getRoomAgendaState, type AgendaKind, type ScheduleCtx } from "@/lib/schedule-utils";
import type { Room, RoomStatus } from "@/types";

export type AgendaFilter = `agenda:${AgendaKind}`;

export interface RoomFiltersState {
  search: string;
  block: string; // "all" ou o nome do bloco
  status: "all" | RoomStatus | AgendaFilter;
  onlyPoweredOn: boolean;
}

export const DEFAULT_ROOM_FILTERS: RoomFiltersState = {
  search: "",
  block: "all",
  status: "all",
  onlyPoweredOn: false,
};

const SENSOR_OPTIONS: RoomStatus[] = ["occupied", "scheduled", "empty", "issue"];

const AGENDA_OPTIONS: { value: AgendaFilter; label: string }[] = [
  { value: "agenda:in_class", label: "Em aula (agenda)" },
  { value: "agenda:soon", label: "Aula em breve (agenda)" },
  { value: "agenda:free", label: "Sem aula agora (agenda)" },
];

const isAgendaFilter = (value: string): value is AgendaFilter => value.startsWith("agenda:");

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filterRooms(list: Room[], filters: RoomFiltersState, ctx: ScheduleCtx): Room[] {
  const query = normalize(filters.search.trim());
  return list.filter((room) => {
    if (query && !normalize(`${room.name} ${room.id} ${room.block}`).includes(query)) return false;
    if (filters.block !== "all" && room.block !== filters.block) return false;

    if (filters.status !== "all") {
      if (isAgendaFilter(filters.status)) {
        if (hasSensors(room)) return false;
        if (getRoomAgendaState(room.id, ctx).kind !== filters.status.slice("agenda:".length)) return false;
      } else if (!hasSensors(room) || room.status !== filters.status) {
        return false;
      }
    }

    if (filters.onlyPoweredOn && room.acStatus !== "on" && room.lightsStatus !== "on") return false;
    return true;
  });
}

interface RoomFiltersProps {
  filters: RoomFiltersState;
  onChange: (filters: RoomFiltersState) => void;
  blocks: string[];
  resultCount: number;
  totalCount: number;
  /** Mostra as situações medidas por sensor (Ocupada, Vazia…). */
  sensorStatuses: boolean;
  /** Mostra as situações calculadas pela agenda (Em aula, Aula em breve…). */
  agendaStatuses: boolean;
}

export function RoomFilters({
  filters,
  onChange,
  blocks,
  resultCount,
  totalCount,
  sensorStatuses,
  agendaStatuses,
}: RoomFiltersProps) {
  const isDirty =
    filters.search !== "" ||
    filters.block !== "all" ||
    filters.status !== "all" ||
    filters.onlyPoweredOn;

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
            placeholder="Buscar sala (ex.: A-101, Bloco B)"
            aria-label="Buscar sala"
            className="pl-9"
          />
        </div>

        <Select value={filters.block} onValueChange={(block) => onChange({ ...filters, block })}>
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

        <Select
          value={filters.status}
          onValueChange={(value) => onChange({ ...filters, status: value as RoomFiltersState["status"] })}
        >
          <SelectTrigger className="w-full lg:w-[210px]" aria-label="Filtrar por situação">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            {sensorStatuses &&
              SENSOR_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {ROOM_STATUS_LABEL[status]}
                </SelectItem>
              ))}
            {agendaStatuses &&
              AGENDA_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="only-powered-on"
            checked={filters.onlyPoweredOn}
            onCheckedChange={(checked) => onChange({ ...filters, onlyPoweredOn: checked })}
          />
          <Label htmlFor="only-powered-on" className="text-sm font-normal">
            Só com equipamento ligado
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Mostrando {resultCount} de {totalCount} salas
        </span>
        {isDirty && (
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_ROOM_FILTERS)}>
            <X className="size-4" aria-hidden />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}