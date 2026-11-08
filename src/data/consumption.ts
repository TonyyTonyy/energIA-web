import type { ConsumptionPoint } from "@/types";

// Consumo do campus (12 salas), por hora, de 06:00 até 18:00 de hoje.
export const consumptionToday: ConsumptionPoint[] = [
  { time: "06:00", acKwh: 2.1, lightsKwh: 0.8, baselineKwh: 16.0 },
  { time: "07:00", acKwh: 8.5, lightsKwh: 3.2, baselineKwh: 20.0 },
  { time: "08:00", acKwh: 14.2, lightsKwh: 3.8, baselineKwh: 27.0 },
  { time: "09:00", acKwh: 14.8, lightsKwh: 3.8, baselineKwh: 28.0 },
  { time: "10:00", acKwh: 14.6, lightsKwh: 3.8, baselineKwh: 28.0 },
  { time: "11:00", acKwh: 13.9, lightsKwh: 3.6, baselineKwh: 28.0 },
  { time: "12:00", acKwh: 6.2, lightsKwh: 1.8, baselineKwh: 27.0 },
  { time: "13:00", acKwh: 8.4, lightsKwh: 2.2, baselineKwh: 26.0 },
  { time: "14:00", acKwh: 13.5, lightsKwh: 3.4, baselineKwh: 26.0 },
  { time: "15:00", acKwh: 16.8, lightsKwh: 4.2, baselineKwh: 28.0 },
  { time: "16:00", acKwh: 17.2, lightsKwh: 4.4, baselineKwh: 28.0 },
  { time: "17:00", acKwh: 17.0, lightsKwh: 4.4, baselineKwh: 28.0 },
  { time: "18:00", acKwh: 15.1, lightsKwh: 4.0, baselineKwh: 27.0 },
];