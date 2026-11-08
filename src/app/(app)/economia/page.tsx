"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SavingsByBlock } from "@/components/savings/savings-by-block";
import { SavingsChart } from "@/components/savings/savings-chart";
import { SavingsSummary } from "@/components/savings/savings-summary";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { savingsHistory } from "@/data/savings";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatBRL } from "@/lib/format";
import { SAVINGS_PERIODS, formatShortDate, type SavingsPeriod } from "@/lib/savings-utils";

export default function Page() {
  const [days, setDays] = useState<SavingsPeriod>(30);
  const data = useMemo(() => savingsHistory.slice(-days), [days]);

  const first = data[0];
  const last = data[data.length - 1];
  const range = first && last ? ` Período: ${formatShortDate(first.date)} a ${formatShortDate(last.date)}.` : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Economia"
        description={`Quanto o sistema já economiza em comparação com o consumo sem automação.${range}`}
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(days)}
            onValueChange={(value) => {
              if (value) setDays(Number(value) as SavingsPeriod);
            }}
          >
            {SAVINGS_PERIODS.map((period) => (
              <ToggleGroupItem key={period} value={String(period)}>
                {period} dias
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />

      <SavingsSummary data={data} />

      <SavingsChart data={data} />

      <SavingsByBlock data={data} />

      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Dados simulados. O cenário &quot;sem o EnergIA&quot; estima o consumo se ar-condicionado e luzes
          seguissem o funcionamento manual de antes do sistema. Economia em reais calculada com a tarifa de{" "}
          {formatBRL(TARIFF_BRL_PER_KWH)}/kWh. O dia de hoje (parcial) aparece no Dashboard.
        </span>
      </p>
    </div>
  );
}