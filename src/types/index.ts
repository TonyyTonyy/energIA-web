export type EquipmentStatus = "on" | "off";
export type RoomStatus = "occupied" | "empty" | "scheduled" | "issue";
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6; // 1 = segunda ... 6 = sábado

export interface Room {
  id: string; // ex.: "A-101"
  name: string; // ex.: "Sala A-101"
  block: string; // ex.: "Bloco A"
  floor: number;
  capacity: number;
  status: RoomStatus;
  occupancy: number; // pessoas detectadas agora
  temperature: number; // °C atual
  targetTemperature: number; // °C alvo
  acStatus: EquipmentStatus;
  lightsStatus: EquipmentStatus;
  powerKw: number; // consumo instantâneo
  hasIssue: boolean;
  issueDescription?: string;
  nextClassAt?: string; // "HH:mm"
    /** false = sala cadastrada manualmente, sem leituras de sensores. Ausente = com sensores. */
  hasSensors?: boolean;
}

export interface ScheduleEvent {
  id: string;
  roomId: string;
  course: string;
  teacher: string;
  weekday: Weekday;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
    /** Aulas criadas juntas (mesma disciplina em vários dias) compartilham o mesmo seriesId. */
  seriesId?: string;
}

export type AIAction =
  | "ac_on"
  | "ac_off"
  | "lights_on"
  | "lights_off"
  | "keep_on"
  | "keep_off";
export type AITrigger = "schedule" | "sensor" | "pattern" | "energy_calc";

export interface AIDecision {
  id: string;
  timestamp: string; // ISO
  roomId: string;
  action: AIAction;
  trigger: AITrigger;
  reason: string; // explicação em português
  confidence: number; // 0–1
  estimatedSavingKwh: number;
}

export interface ConsumptionPoint {
  time: string; // "HH:mm"
  acKwh: number;
  lightsKwh: number;
  baselineKwh: number; // consumo sem o sistema
}

export interface SavingsPoint {
  date: string; // ISO date
  baselineKwh: number;
  actualKwh: number;
  savedKwh: number;
  savedBRL: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO
}

export interface SimulationInput {
  roomId: string;
  idleHours: number; // horas até a próxima aula
  outsideTemperature: number; // °C
  season: "verao" | "outono" | "inverno" | "primavera";
}

export interface SimulationResult {
  keepOnKwh: number;
  turnOffKwh: number;
  recommended: "keep_on" | "turn_off";
  savingKwh: number;
  savingBRL: number;
  preCoolMinutes: number; // antecedência para religar
  explanation: string;
}
