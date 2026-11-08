import type { Room } from "@/types";

export const ROOM_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const ROOM_LIMITS = {
  codeMax: 12,
  nameMax: 40,
  blockMax: 30,
  floorMin: 0,
  floorMax: 20,
  capacityMin: 1,
  capacityMax: 500,
  tempMin: 16,
  tempMax: 30,
} as const;

export const DEFAULT_TARGET_TEMPERATURE = 23;

/** Salas simuladas não têm o campo (têm sensores). Salas cadastradas têm hasSensors: false. */
export const hasSensors = (room: Room): boolean => room.hasSensors !== false;

export const floorLabel = (floor: number): string => (floor === 0 ? "Térreo" : `${floor}º andar`);

export const compareRooms = (a: Room, b: Room): number =>
  a.block.localeCompare(b.block, "pt-BR") || a.id.localeCompare(b.id, "pt-BR", { numeric: true });

// ───────── Formulário ─────────
export interface RoomFormValues {
  code: string;
  name: string;
  block: string;
  floor: string;
  capacity: string;
  targetTemperature: string;
}

export interface RoomInput {
  id: string;
  name: string;
  block: string;
  floor: number;
  capacity: number;
  targetTemperature: number;
}

export type RoomFormErrors = Partial<Record<keyof RoomFormValues, string>>;
export type RoomValidation = { ok: true; value: RoomInput } | { ok: false; errors: RoomFormErrors };

export function emptyRoomForm(): RoomFormValues {
  return {
    code: "",
    name: "",
    block: "",
    floor: "1",
    capacity: "40",
    targetTemperature: String(DEFAULT_TARGET_TEMPERATURE),
  };
}

export function roomToForm(room: Room): RoomFormValues {
  return {
    code: room.id,
    name: room.name,
    block: room.block,
    floor: String(room.floor),
    capacity: String(room.capacity),
    targetTemperature: String(room.targetTemperature).replace(".", ","),
  };
}

const parseNumber = (raw: string): number => {
  const s = raw.trim().replace(",", ".");
  return s === "" ? NaN : Number(s);
};

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

/** Em edição (editingId), o código não é validado nem alterado. */
export function validateRoomForm(values: RoomFormValues, rooms: Room[], editingId?: string): RoomValidation {
  const L = ROOM_LIMITS;
  const errors: RoomFormErrors = {};

  const id = editingId ?? values.code.trim().toUpperCase();
  if (!editingId) {
    if (!id) errors.code = "Informe o código da sala.";
    else if (id.length > L.codeMax) errors.code = `Use no máximo ${L.codeMax} caracteres.`;
    else if (!ROOM_CODE_PATTERN.test(id)) errors.code = "Use só letras, números e hífen (ex.: A-101).";
    else if (rooms.some((r) => r.id.toLowerCase() === id.toLowerCase())) {
      errors.code = `Já existe uma sala com o código ${id}.`;
    }
  }

  const name = collapse(values.name) || `Sala ${id}`;
  if (name.length > L.nameMax) errors.name = `Use no máximo ${L.nameMax} caracteres.`;

  let block = collapse(values.block);
  if (!block) errors.block = "Informe o bloco (ex.: Bloco A).";
  else if (block.length > L.blockMax) errors.block = `Use no máximo ${L.blockMax} caracteres.`;
  else block = rooms.find((r) => r.block.toLowerCase() === block.toLowerCase())?.block ?? block;

  const floor = parseNumber(values.floor);
  if (!Number.isInteger(floor) || floor < L.floorMin || floor > L.floorMax) {
    errors.floor = `Informe um andar inteiro de ${L.floorMin} (térreo) a ${L.floorMax}.`;
  }

  const capacity = parseNumber(values.capacity);
  if (!Number.isInteger(capacity) || capacity < L.capacityMin || capacity > L.capacityMax) {
    errors.capacity = `Informe uma capacidade inteira de ${L.capacityMin} a ${L.capacityMax}.`;
  }

  const temp = parseNumber(values.targetTemperature);
  if (!Number.isFinite(temp) || temp < L.tempMin || temp > L.tempMax) {
    errors.targetTemperature = `Use um valor entre ${L.tempMin} e ${L.tempMax} °C.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: { id, name, block, floor, capacity, targetTemperature: Math.round(temp * 2) / 2 },
  };
}

/** Sala nova: cadastrada à mão, então sem sensores e com equipamentos desligados. */
export function createRoom(input: RoomInput): Room {
  return {
    id: input.id,
    name: input.name,
    block: input.block,
    floor: input.floor,
    capacity: input.capacity,
    status: "empty",
    occupancy: 0,
    temperature: input.targetTemperature,
    targetTemperature: input.targetTemperature,
    acStatus: "off",
    lightsStatus: "off",
    powerKw: 0,
    hasIssue: false,
    hasSensors: false,
  };
}

export function roomPatch(input: RoomInput, room: Room): Partial<Omit<Room, "id">> {
  return {
    name: input.name,
    block: input.block,
    floor: input.floor,
    capacity: input.capacity,
    targetTemperature: input.targetTemperature,
    ...(hasSensors(room) ? {} : { temperature: input.targetTemperature }),
  };
}