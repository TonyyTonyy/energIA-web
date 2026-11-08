"use client";

import { useMemo, useState } from "react";
import { DoorOpen, Info, Plus, SearchX } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { RoomCard } from "@/components/rooms/room-card";
import {
  DEFAULT_ROOM_FILTERS,
  RoomFilters,
  filterRooms,
  type RoomFiltersState,
} from "@/components/rooms/room-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useRoomDialogs } from "@/hooks/use-room-dialogs";
import { hasSensors } from "@/lib/room-utils";

export default function Page() {
    const { rooms, canEdit, setMockEnabled, scheduleCtx } = useAppData();
  const dialogs = useRoomDialogs();
  const [filters, setFilters] = useState<RoomFiltersState>(DEFAULT_ROOM_FILTERS);

  const blocks = useMemo(() => Array.from(new Set(rooms.map((r) => r.block))).sort(), [rooms]);
    const filtered = useMemo(() => filterRooms(rooms, filters, scheduleCtx), [rooms, filters, scheduleCtx]);
  const someWithoutSensors = rooms.some((r) => !hasSensors(r));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salas"
        description="Situação em tempo real de cada sala: ocupação, temperatura, equipamentos e consumo."
        actions={
          canEdit ? (
            <Button size="sm" onClick={dialogs.openCreate}>
              <Plus className="size-4" aria-hidden />
              Cadastrar sala
            </Button>
          ) : undefined
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Nenhuma sala cadastrada"
          description={
            canEdit
              ? "Cadastre as salas do campus para começar. Elas ficam guardadas neste navegador e começam sem sensores."
              : "Ative os dados simulados para ver o protótipo completo."
          }
          action={
            canEdit ? (
              <Button size="sm" onClick={dialogs.openCreate}>
                <Plus className="size-4" aria-hidden />
                Cadastrar sala
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setMockEnabled(true)}>
                Ativar dados simulados
              </Button>
            )
          }
        />
      ) : (
        <>
          {canEdit && someWithoutSensors && (
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                Salas cadastradas ainda não têm sensores: temperatura, ocupação e consumo aparecem como &quot;sem
                sensor&quot;.
              </span>
            </p>
          )}

          <RoomFilters
            filters={filters}
            onChange={setFilters}
                       blocks={blocks}
            sensorStatuses={rooms.some(hasSensors)}
            agendaStatuses={someWithoutSensors}
            resultCount={filtered.length}
            totalCount={rooms.length}
          />

          {filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onEdit={canEdit ? dialogs.openEdit : undefined}
                  onDelete={canEdit ? dialogs.openDelete : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Nenhuma sala encontrada"
              description="Tente ajustar a busca ou remover algum filtro."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_ROOM_FILTERS)}>
                  Limpar filtros
                </Button>
              }
            />
          )}
        </>
      )}

      {dialogs.element}
    </div>
  );
}