import type { Room } from "@/types";

/** "Agora" fixo do protótipo: sexta-feira, 18:40. Sem fuso, para não gerar mismatch de hidratação. */
export const MOCK_NOW = "2026-11-06T18:40:00";

export const rooms: Room[] = [
  // ───────── Bloco A ─────────
  {
    id: "A-101", name: "Sala A-101", block: "Bloco A", floor: 1, capacity: 40,
    status: "occupied", occupancy: 34, temperature: 23.4, targetTemperature: 23,
    acStatus: "on", lightsStatus: "on", powerKw: 3.6, hasIssue: false,
  },
  {
    id: "A-102", name: "Sala A-102", block: "Bloco A", floor: 1, capacity: 40,
    status: "scheduled", occupancy: 0, temperature: 26.8, targetTemperature: 23,
    acStatus: "on", lightsStatus: "off", powerKw: 2.9, hasIssue: false, nextClassAt: "19:00",
  },
  {
    id: "A-201", name: "Sala A-201", block: "Bloco A", floor: 2, capacity: 35,
    status: "empty", occupancy: 0, temperature: 28.9, targetTemperature: 23,
    acStatus: "off", lightsStatus: "off", powerKw: 0, hasIssue: false,
  },
  {
    id: "A-202", name: "Sala A-202", block: "Bloco A", floor: 2, capacity: 35,
    status: "occupied", occupancy: 28, temperature: 23.1, targetTemperature: 23,
    acStatus: "on", lightsStatus: "on", powerKw: 3.2, hasIssue: false,
  },

  // ───────── Bloco B ─────────
  {
    id: "B-101", name: "Sala B-101", block: "Bloco B", floor: 1, capacity: 45,
    status: "scheduled", occupancy: 0, temperature: 27.4, targetTemperature: 23,
    acStatus: "on", lightsStatus: "on", powerKw: 3.1, hasIssue: false, nextClassAt: "19:00",
  },
  {
    id: "B-102", name: "Sala B-102", block: "Bloco B", floor: 1, capacity: 45,
    status: "empty", occupancy: 0, temperature: 29.3, targetTemperature: 23,
    acStatus: "off", lightsStatus: "off", powerKw: 0, hasIssue: false,
  },
  {
    id: "B-201", name: "Sala B-201", block: "Bloco B", floor: 2, capacity: 40,
    status: "issue", occupancy: 0, temperature: 29.5, targetTemperature: 23,
    acStatus: "off", lightsStatus: "off", powerKw: 0.05, hasIssue: true,
    issueDescription: "Ar-condicionado não responde aos comandos (possível falha no compressor).",
    nextClassAt: "19:00",
  },
  {
    id: "B-202", name: "Sala B-202", block: "Bloco B", floor: 2, capacity: 50,
    status: "occupied", occupancy: 41, temperature: 23.8, targetTemperature: 23,
    acStatus: "on", lightsStatus: "on", powerKw: 4.4, hasIssue: false,
  },

  // ───────── Bloco C ─────────
  {
    id: "C-101", name: "Sala C-101", block: "Bloco C", floor: 1, capacity: 40,
    status: "empty", occupancy: 0, temperature: 28.1, targetTemperature: 23,
    acStatus: "off", lightsStatus: "off", powerKw: 0, hasIssue: false, nextClassAt: "19:30",
  },
  {
    id: "C-102", name: "Sala C-102", block: "Bloco C", floor: 1, capacity: 40,
    status: "scheduled", occupancy: 0, temperature: 25.9, targetTemperature: 23,
    acStatus: "on", lightsStatus: "off", powerKw: 2.6, hasIssue: false, nextClassAt: "19:00",
  },
  {
    id: "C-201", name: "Lab. C-201", block: "Bloco C", floor: 2, capacity: 30,
    status: "occupied", occupancy: 22, temperature: 22.9, targetTemperature: 23,
    acStatus: "on", lightsStatus: "on", powerKw: 5.1, hasIssue: false,
  },
  {
    id: "C-202", name: "Sala C-202", block: "Bloco C", floor: 2, capacity: 35,
    status: "empty", occupancy: 0, temperature: 29.0, targetTemperature: 23,
    acStatus: "off", lightsStatus: "off", powerKw: 0, hasIssue: false,
  },
];

export function getRoomById(id: string): Room | undefined {
  return rooms.find((room) => room.id === id);
}