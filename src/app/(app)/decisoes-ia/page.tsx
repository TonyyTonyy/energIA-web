"use client";

import { useMemo, useState } from "react";
import { Activity, Calculator, Gauge, PiggyBank, SearchX } from "lucide-react";

import { DecisionCard } from "@/components/ai/decision-card";
import {
  DEFAULT_DECISION_FILTERS,
  DecisionFilters,
  filterDecisions,
  type DecisionFiltersState,
  type DecisionView,
} from "@/components/ai/decision-filters";
import { DecisionLogTable } from "@/components/ai/decision-log-table";
import { PatternsInsights } from "@/components/ai/patterns-insights";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiDecisions } from "@/data/decisions";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatBRL, formatKwh } from "@/lib/format";

// Resumo calculado uma vez (os dados são estáticos)
const totalSavingKwh = aiDecisions.reduce((s, d) => s + d.estimatedSavingKwh, 0);
const avgConfidencePct = Math.round(
  (aiDecisions.reduce((s, d) => s + d.confidence, 0) / aiDecisions.length) * 100,
);
const roomsServed = new Set(aiDecisions.map((d) => d.roomId)).size;
const smartDecisions = aiDecisions.filter((d) => d.trigger === "energy_calc" || d.trigger === "pattern");
const smartSavingKwh = smartDecisions.reduce((s, d) => s + d.estimatedSavingKwh, 0);
const smartSharePct = totalSavingKwh > 0 ? Math.round((smartSavingKwh / totalSavingKwh) * 100) : 0;

export default function Page() {
  const [filters, setFilters] = useState<DecisionFiltersState>(DEFAULT_DECISION_FILTERS);
  const [view, setView] = useState<DecisionView>("table");
  const filtered = useMemo(() => filterDecisions(aiDecisions, filters), [filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decisões da IA"
        description="Tudo o que o sistema decidiu, o motivo de cada decisão e o que ele já aprendeu sobre o uso das salas."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Decisões hoje"
          value={String(aiDecisions.length)}
          hint={`em ${roomsServed} salas diferentes`}
          icon={Activity}
          tone="info"
        />
        <StatCard
          title="Economia estimada"
          value={formatBRL(totalSavingKwh * TARIFF_BRL_PER_KWH)}
          hint={`${formatKwh(totalSavingKwh)} nas decisões registradas`}
          icon={PiggyBank}
          tone="success"
        />
        <StatCard
          title="Confiança média"
          value={`${avgConfidencePct}%`}
          hint="certeza da IA ao decidir"
          icon={Gauge}
        />
        <StatCard
          title="Economia por cálculo e padrões"
          value={formatKwh(smartSavingKwh)}
          hint={`${smartDecisions.length} decisões · ${smartSharePct}% da economia`}
          icon={Calculator}
          tone="warning"
        />
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Log de decisões</TabsTrigger>
          <TabsTrigger value="patterns">Padrões aprendidos</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-4 space-y-4">
          <DecisionFilters
            filters={filters}
            onChange={setFilters}
            view={view}
            onViewChange={setView}
            resultCount={filtered.length}
            totalCount={aiDecisions.length}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nenhuma decisão encontrada"
              description="Tente ajustar a busca ou remover algum filtro."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_DECISION_FILTERS)}>
                  Limpar filtros
                </Button>
              }
            />
          ) : view === "table" ? (
            <DecisionLogTable decisions={filtered} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((decision) => (
                <DecisionCard key={decision.id} decision={decision} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="mt-4">
          <PatternsInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}