import {
  BrainCircuit,
  Calculator,
  CalendarDays,
  DoorOpen,
  LayoutDashboard,
  MessageSquare,
  PiggyBank,
  Settings,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

import type { AIAction, AITrigger, RoomStatus, Weekday } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Salas", href: "/salas", icon: DoorOpen },
  { title: "Agenda", href: "/agenda", icon: CalendarDays },
  { title: "Decisões da IA", href: "/decisoes-ia", icon: BrainCircuit },
  { title: "Simulador", href: "/simulador", icon: Calculator },
  { title: "Economia", href: "/economia", icon: PiggyBank },
  { title: "Assistente", href: "/assistente", icon: MessageSquare },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];

export const TARIFF_BRL_PER_KWH = 0.95;

export const BLOCKS = ["Bloco A", "Bloco B", "Bloco C"] as const;

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  occupied: "Ocupada",
  empty: "Vazia",
  scheduled: "Aula em breve",
  issue: "Com problema",
};

export const AI_ACTION_LABEL: Record<AIAction, string> = {
  ac_on: "Ligou o ar-condicionado",
  ac_off: "Desligou o ar-condicionado",
  lights_on: "Acendeu as luzes",
  lights_off: "Apagou as luzes",
  keep_on: "Manteve ligado",
  keep_off: "Manteve desligado",
};

export const AI_TRIGGER_LABEL: Record<AITrigger, string> = {
  schedule: "Agenda",
  sensor: "Sensor",
  pattern: "Padrão aprendido",
  energy_calc: "Cálculo energético",
};

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};
