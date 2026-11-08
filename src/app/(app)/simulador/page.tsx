"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DoorOpen } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { SimulatorComparisonChart } from "@/components/simulator/simulator-comparison-chart";
import { SimulatorForm, defaultsFor } from "@/components/simulator/simulator-form";
import { SimulatorResult } from "@/components/simulator/simulator-result";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { simulate } from "@/lib/simulation";
import type { SimulationInput } from "@/types";

export default function Page() {
  const { rooms } = useAppData();
  const defaults = useMemo(() => defaultsFor(rooms), [rooms]);
  const [input, setInput] = useState<SimulationInput>(defaults);

  // Se a sala escolhida deixar de existir (ex.: excluída em outra aba), volta para a sala padrão.
  const effective = useMemo<SimulationInput>(
    () =>
      rooms.some((r) => r.id === input.roomId && !r.hasIssue) ? input : { ...input, roomId: defaults.roomId },
    [rooms, input, defaults],
  );
  const details = useMemo(() => (rooms.length === 0 ? null : simulate(effective, rooms)), [effective, rooms]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulador"
        description="Vale mais a pena desligar o ar agora e religar depois, ou mantê-lo ligado? Veja como a IA calcula."
      />

      {details === null ? (
        <EmptyState
          icon={DoorOpen}
          title="Cadastre uma sala para simular"
          description="O simulador calcula a economia de uma sala específica, usando a capacidade e a temperatura alvo dela. Cadastre ao menos uma sala."
          action={
            <Link href="/salas" className={buttonVariants({ size: "sm" })}>
              Ir para Salas
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-3">
            <SimulatorForm value={effective} onChange={setInput} rooms={rooms} defaults={defaults} />
            <SimulatorResult details={details} className="xl:col-span-2" />
          </div>

          <SimulatorComparisonChart details={details} />
        </>
      )}
    </div>
  );
}