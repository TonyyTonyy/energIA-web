import type { Room, ScheduleEvent } from "@/types";

export const STORAGE_KEY = "energia:data:v1";

export interface UserData {
  mockEnabled: boolean;
  rooms: Room[];
  events: ScheduleEvent[];
}

export type ActionResult = { ok: true } | { ok: false; error: string };

// Nunca é mutado (só substituído), então pode servir de snapshot do servidor.
const DEFAULT_DATA: UserData = { mockEnabled: true, rooms: [], events: [] };

let cache: UserData | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): UserData {
  if (!raw) return DEFAULT_DATA;
  try {
    const p = JSON.parse(raw) as Partial<UserData>;
    return {
      mockEnabled: typeof p.mockEnabled === "boolean" ? p.mockEnabled : true,
      rooms: Array.isArray(p.rooms) ? p.rooms : [],
      events: Array.isArray(p.events) ? p.events : [],
    };
  } catch {
    return DEFAULT_DATA;
  }
}

function load(): UserData {
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_DATA;
  }
}

function commit(next: UserData) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // armazenamento cheio ou bloqueado: os dados ficam só em memória
  }
  listeners.forEach((listener) => listener());
}

// ───────── Contrato do useSyncExternalStore ─────────
export function getSnapshot(): UserData {
  if (cache === null) cache = load();
  return cache;
}

export function getServerSnapshot(): UserData {
  return DEFAULT_DATA;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cache = load();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────── Ações (sempre atuam nos dados cadastrados pelo usuário) ─────────
export function setMockEnabled(value: boolean) {
  commit({ ...getSnapshot(), mockEnabled: value });
}

export function addRoom(room: Room): ActionResult {
  const id = room.id.trim();
  if (!id) return { ok: false, error: "Informe o código da sala." };

  const current = getSnapshot();
  if (current.rooms.some((r) => r.id.toLowerCase() === id.toLowerCase())) {
    return { ok: false, error: `Já existe uma sala com o código ${id}.` };
  }
  commit({ ...current, rooms: [...current.rooms, { ...room, id }] });
  return { ok: true };
}

export function updateRoom(id: string, patch: Partial<Omit<Room, "id">>) {
  const current = getSnapshot();
  commit({ ...current, rooms: current.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

/** Remove a sala e todas as aulas dela. */
export function removeRoom(id: string) {
  const current = getSnapshot();
  commit({
    ...current,
    rooms: current.rooms.filter((r) => r.id !== id),
    events: current.events.filter((e) => e.roomId !== id),
  });
}

export function addEvent(event: ScheduleEvent) {
  const current = getSnapshot();
  commit({ ...current, events: [...current.events, event] });
}

export function updateEvent(id: string, patch: Partial<Omit<ScheduleEvent, "id">>) {
  const current = getSnapshot();
  commit({ ...current, events: current.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}

export function removeEvent(id: string) {
  const current = getSnapshot();
  commit({ ...current, events: current.events.filter((e) => e.id !== id) });
}

/** Apaga salas e aulas cadastradas. Não mexe no modo (simulado ou real). */
export function clearUserData() {
  commit({ ...getSnapshot(), rooms: [], events: [] });
}

/** Remove e adiciona aulas numa única gravação (usado ao cadastrar, editar e excluir aulas). */
export function replaceEvents(removeIds: string[], add: ScheduleEvent[]) {
  const current = getSnapshot();
  const drop = new Set(removeIds);
  commit({ ...current, events: [...current.events.filter((e) => !drop.has(e.id)), ...add] });
}

/** Substitui salas e aulas cadastradas (importação). Não mexe no modo (simulado ou real). */
export function replaceUserData(rooms: Room[], events: ScheduleEvent[]) {
  commit({ ...getSnapshot(), rooms, events });
}