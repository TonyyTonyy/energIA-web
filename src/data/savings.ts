import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import type { SavingsPoint } from "@/types";

const round1 = (n: number) => Math.round(n * 10) / 10;
const pad = (n: number) => String(n).padStart(2, "0");

// 30 dias (07/10 a 05/11/2026), determinístico (sem Math.random).
// A economia cresce ao longo do tempo, simulando o aprendizado da IA.
export const savingsHistory: SavingsPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 9, 7 + i);
  const dow = d.getDay(); // 0 = domingo

  const baselineKwh = round1(
    dow === 0 ? 120 : dow === 6 ? 260 : 380 + ((i * 7) % 5) * 8,
  );
  const pct = 0.22 + i * 0.005 + ((i * 3) % 7) * 0.004;
  const actualKwh = round1(baselineKwh * (1 - pct));
  const savedKwh = round1(baselineKwh - actualKwh);

  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    baselineKwh,
    actualKwh,
    savedKwh,
    savedBRL: Math.round(savedKwh * TARIFF_BRL_PER_KWH * 100) / 100,
  };
});