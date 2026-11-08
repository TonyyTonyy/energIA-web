import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { rooms } from "@/data/rooms";
import { BLOCKS, TARIFF_BRL_PER_KWH } from "@/lib/constants";
import type { SavingsPoint } from "@/types";

export type SavingsPeriod = 7 | 14 | 30;
export const SAVINGS_PERIODS: SavingsPeriod[] = [7, 14, 30];

/** "2026-10-07" → "07/10" */
export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM", { locale: ptBR });
}

/** "2026-10-07" → "qua, 07/10" */
export function formatWeekdayDate(isoDate: string): string {
  return format(parseISO(isoDate), "EEE, dd/MM", { locale: ptBR });
}

export function percentLabel(n: number): string {
  return `${Math.round(n)}%`;
}

export interface SavingsTotals {
  days: number;
  baselineKwh: number;
  actualKwh: number;
  savedKwh: number;
  savedBRL: number;
  savedPct: number; // 0–100
  avgDailyBRL: number;
  bestDay?: SavingsPoint;
}

export function summarize(data: SavingsPoint[]): SavingsTotals {
  const baselineKwh = data.reduce((s, p) => s + p.baselineKwh, 0);
  const actualKwh = data.reduce((s, p) => s + p.actualKwh, 0);
  const savedKwh = data.reduce((s, p) => s + p.savedKwh, 0);
  const savedBRL = data.reduce((s, p) => s + p.savedBRL, 0);
  const days = data.length;

  const bestDay = data.reduce<SavingsPoint | undefined>(
    (best, p) => (!best || p.savedBRL > best.savedBRL ? p : best),
    undefined,
  );

  return {
    days,
    baselineKwh,
    actualKwh,
    savedKwh,
    savedBRL,
    savedPct: baselineKwh > 0 ? (savedKwh / baselineKwh) * 100 : 0,
    avgDailyBRL: days > 0 ? savedBRL / days : 0,
    bestDay,
  };
}

// ───────── Divisão por bloco (mock determinístico) ─────────
// baselineShare: fatia do consumo sem o sistema. efficiency: quão bem a IA aproveita o bloco.
const BLOCK_PROFILE: Record<(typeof BLOCKS)[number], { baselineShare: number; efficiency: number }> = {
  "Bloco A": { baselineShare: 0.32, efficiency: 1.04 },
  "Bloco B": { baselineShare: 0.36, efficiency: 0.9 },
  "Bloco C": { baselineShare: 0.32, efficiency: 1.07 },
};

export interface BlockSavings {
  block: string;
  roomCount: number;
  baselineKwh: number;
  actualKwh: number;
  savedKwh: number;
  savedBRL: number;
  savedPct: number; // 0–100
}

/** Reparte o total do período entre os blocos. A soma dos blocos sempre fecha com o total. */
export function splitByBlock(totals: SavingsTotals): BlockSavings[] {
  const weights = BLOCKS.map((b) => BLOCK_PROFILE[b].baselineShare * BLOCK_PROFILE[b].efficiency);
  const weightSum = weights.reduce((s, w) => s + w, 0);

  return BLOCKS.map((block, i) => {
    const baselineKwh = totals.baselineKwh * BLOCK_PROFILE[block].baselineShare;
    const savedKwh = totals.savedKwh * (weights[i] / weightSum);
    return {
      block,
      roomCount: rooms.filter((r) => r.block === block).length,
      baselineKwh,
      actualKwh: baselineKwh - savedKwh,
      savedKwh,
      savedBRL: savedKwh * TARIFF_BRL_PER_KWH,
      savedPct: baselineKwh > 0 ? (savedKwh / baselineKwh) * 100 : 0,
    };
  });
}