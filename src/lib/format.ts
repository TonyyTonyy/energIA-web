import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatKwh(n: number): string {
  return `${decimal.format(n)} kWh`;
}

export function formatBRL(n: number): string {
  return currency.format(n).replace(/\u00a0/g, " ");
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: ptBR });
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatTemp(n: number): string {
  return `${decimal.format(n)} °C`;
}

export function formatKw(n: number): string {
  return `${n.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: n > 0 && n < 0.1 ? 2 : 1,
  })} kW`;
}