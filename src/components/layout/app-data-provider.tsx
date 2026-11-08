"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { consumptionToday as mockConsumption } from "@/data/consumption";
import { aiDecisions as mockDecisions } from "@/data/decisions";
import { rooms as mockRooms } from "@/data/rooms";
import { scheduleEvents as mockEvents } from "@/data/schedule";
import {
  addEvent,
  addRoom,
  clearUserData,
  getServerSnapshot,
  getSnapshot,
  removeEvent,
  removeRoom,
  replaceEvents,
  setMockEnabled,
  subscribe,
  updateEvent,
  updateRoom,
  replaceUserData,
} from "@/lib/app-store";
import { compareRooms } from "@/lib/room-utils";
import { MOCK_CTX, realClock, type ClockState, type ScheduleCtx } from "@/lib/schedule-utils";
import type { AIDecision, ConsumptionPoint, Room, ScheduleEvent } from "@/types";

const actions = {
  setMockEnabled,
  addRoom,
  updateRoom,
  removeRoom,
  addEvent,
  updateEvent,
  removeEvent,
  replaceEvents,
  clearUserData,
  replaceUserData,
};

export type AppDataContextValue = typeof actions & {
  /** false até o navegador hidratar e ler o armazenamento local. */
  ready: boolean;
  mockEnabled: boolean;
  /** Só dá para cadastrar e editar no modo real. */
  canEdit: boolean;
  rooms: Room[];
  scheduleEvents: ScheduleEvent[];
  decisions: AIDecision[];
  consumptionToday: ConsumptionPoint[];
  userRoomCount: number;
  userEventCount: number;
  getRoomById: (id: string) => Room | undefined;
  /** Simulado: sexta 18:40 fixo. Real: relógio do navegador, atualizado a cada minuto. */
  clock: ClockState;
  /** Aulas, salas e relógio juntos, para as funções de lib/schedule-utils. */
  scheduleCtx: ScheduleCtx;
};

const EMPTY_DECISIONS: AIDecision[] = [];
const EMPTY_CONSUMPTION: ConsumptionPoint[] = [];

const AppDataContext = createContext<AppDataContextValue | null>(null);

const subscribeNever = () => () => {};

// Minuto atual (só muda uma vez por minuto), para o relógio do modo real.
const currentMinute = () => Math.floor(Date.now() / 60000);
function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 15000);
  return () => window.clearInterval(id);
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => 0);

  const value = useMemo<AppDataContextValue>(() => {
    const mock = data.mockEnabled;
    const rooms = mock ? mockRooms : [...data.rooms].sort(compareRooms);
    const scheduleEvents = mock ? mockEvents : data.events;
    const scheduleCtx: ScheduleCtx = mock
      ? MOCK_CTX
      : { events: scheduleEvents, rooms, clock: realClock(new Date(minute * 60000)) };

    return {
      ...actions,
      ready,
      mockEnabled: mock,
      canEdit: !mock,
      rooms,
      scheduleEvents,
      decisions: mock ? mockDecisions : EMPTY_DECISIONS,
      consumptionToday: mock ? mockConsumption : EMPTY_CONSUMPTION,
      userRoomCount: data.rooms.length,
      userEventCount: data.events.length,
      getRoomById: (id: string) => rooms.find((r) => r.id === id),
      clock: scheduleCtx.clock,
      scheduleCtx,
    };
    // No modo simulado o relógio é fixo, então o minuto não deve recalcular nada.
  }, [data, ready, data.mockEnabled ? 0 : minute]); // eslint-disable-line react-hooks/exhaustive-deps

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData deve ser usado dentro de <AppDataProvider>.");
  return ctx;
}