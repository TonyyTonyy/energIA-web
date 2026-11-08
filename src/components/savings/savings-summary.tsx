import { PiggyBank, Sparkles, TrendingUp, Trophy, Zap } from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { savingsHistory } from "@/data/savings";
import { formatBRL, formatKwh } from "@/lib/format";
import { formatWeekdayDate, percentLabel, summarize } from "@/lib/savings-utils";
import type { SavingsPoint } from "@/types";

export function SavingsSummary({ data }: { data: SavingsPoint[] }) {
  const totals = summarize(data);
  const best = totals.bestDay;
  const bestPct = best && best.baselineKwh > 0 ? (best.savedKwh / best.baselineKwh) * 100 : 0;

  // Evolução da IA: sempre sobre o histórico completo (primeira semana x última semana)
  const hasHistory = savingsHistory.length >= 14;
  const firstWeekPct = hasHistory ? summarize(savingsHistory.slice(0, 7)).savedPct : 0;
  const lastWeekPct = hasHistory ? summarize(savingsHistory.slice(-7)).savedPct : 0;

  return (
    <div className="space-y-4">
      {hasHistory && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              A economia subiu de {percentLabel(firstWeekPct)} para {percentLabel(lastWeekPct)} em um mês
            </p>
            <p className="text-sm text-muted-foreground">
              Comparando a primeira com a última semana do histórico. À medida que a IA aprende os padrões
              de uso das salas, ela desperdiça menos energia.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Economia no período"
          value={formatBRL(totals.savedBRL)}
          hint={`${totals.days} dias · média de ${formatBRL(totals.avgDailyBRL)} por dia`}
          icon={PiggyBank}
          tone="success"
        />
        <StatCard
          title="Energia evitada"
          value={formatKwh(totals.savedKwh)}
          hint={`${percentLabel(totals.savedPct)} a menos do que sem o sistema`}
          icon={Zap}
          tone="warning"
        />
        <StatCard
          title="Projeção anual"
          value={formatBRL(totals.avgDailyBRL * 365)}
          hint="mantendo o ritmo do período"
          icon={TrendingUp}
          tone="info"
        />
        <StatCard
          title="Melhor dia"
          value={best ? formatBRL(best.savedBRL) : "—"}
          hint={best ? `${formatWeekdayDate(best.date)} · ${percentLabel(bestPct)} de economia` : "Sem dados"}
          icon={Trophy}
        />
      </div>
    </div>
  );
}