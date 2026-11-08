"use client";

import { LayoutGrid, List, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { aiDecisions } from "@/data/decisions";
import { getRoomById } from "@/data/rooms";
import { AI_ACTION_LABEL, AI_TRIGGER_LABEL } from "@/lib/constants";
import type { AIAction, AIDecision, AITrigger } from "@/types";

export type DecisionView = "table" | "cards";

export interface DecisionFiltersState {
  search: string;
  roomId: string; // "all" ou o id da sala
  action: "all" | AIAction;
  trigger: "all" | AITrigger;
  onlySavings: boolean;
}

export const DEFAULT_DECISION_FILTERS: DecisionFiltersState = {
  search: "",
  roomId: "all",
  action: "all",
  trigger: "all",
  onlySavings: false,
};

const ROOM_IDS = Array.from(new Set(aiDecisions.map((d) => d.roomId))).sort();
const ACTIONS = Object.keys(AI_ACTION_LABEL) as AIAction[];
const TRIGGERS = Object.keys(AI_TRIGGER_LABEL) as AITrigger[];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Filtra e devolve ordenado do mais recente para o mais antigo. */
export function filterDecisions(list: AIDecision[], filters: DecisionFiltersState): AIDecision[] {
  const query = normalize(filters.search.trim());

  return list
    .filter((d) => {
      if (filters.roomId !== "all" && d.roomId !== filters.roomId) return false;
      if (filters.action !== "all" && d.action !== filters.action) return false;
      if (filters.trigger !== "all" && d.trigger !== filters.trigger) return false;
      if (filters.onlySavings && d.estimatedSavingKwh <= 0) return false;
      if (query) {
        const roomName = getRoomById(d.roomId)?.name ?? d.roomId;
        if (!normalize(`${d.reason} ${roomName} ${d.roomId}`).includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

interface DecisionFiltersProps {
  filters: DecisionFiltersState;
  onChange: (filters: DecisionFiltersState) => void;
  view: DecisionView;
  onViewChange: (view: DecisionView) => void;
  resultCount: number;
  totalCount: number;
}

export function DecisionFilters({
  filters,
  onChange,
  view,
  onViewChange,
  resultCount,
  totalCount,
}: DecisionFiltersProps) {
  const isDirty =
    filters.search !== "" ||
    filters.roomId !== "all" ||
    filters.action !== "all" ||
    filters.trigger !== "all" ||
    filters.onlySavings;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:min-w-[220px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Buscar no motivo ou na sala"
            aria-label="Buscar decisões"
            className="pl-9"
          />
        </div>

        <Select value={filters.roomId} onValueChange={(value) => onChange({ ...filters, roomId: value })}>
          <SelectTrigger className="w-full lg:w-[160px]" aria-label="Filtrar por sala">
            <SelectValue placeholder="Sala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as salas</SelectItem>
            {ROOM_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {getRoomById(id)?.name ?? id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.action}
          onValueChange={(value) => onChange({ ...filters, action: value as DecisionFiltersState["action"] })}
        >
          <SelectTrigger className="w-full lg:w-[220px]" aria-label="Filtrar por ação">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {AI_ACTION_LABEL[action]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.trigger}
          onValueChange={(value) => onChange({ ...filters, trigger: value as DecisionFiltersState["trigger"] })}
        >
          <SelectTrigger className="w-full lg:w-[200px]" aria-label="Filtrar por origem">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {TRIGGERS.map((trigger) => (
              <SelectItem key={trigger} value={trigger}>
                {AI_TRIGGER_LABEL[trigger]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="only-savings"
            checked={filters.onlySavings}
            onCheckedChange={(checked) => onChange({ ...filters, onlySavings: checked })}
          />
          <Label htmlFor="only-savings" className="text-sm font-normal">
            Só com economia
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Mostrando {resultCount} de {totalCount} decisões
          </span>
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_DECISION_FILTERS)}>
              <X className="size-4" aria-hidden />
              Limpar filtros
            </Button>
          )}
        </div>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={view}
          onValueChange={(value) => {
            if (value) onViewChange(value as DecisionView);
          }}
        >
          <ToggleGroupItem value="table" aria-label="Ver em tabela">
            <List className="size-4" aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Ver em cards">
            <LayoutGrid className="size-4" aria-hidden />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}