"use client";

import Link from "next/link";
import { DoorOpen } from "lucide-react";

import { ConsumptionChart } from "@/components/dashboard/consumption-chart";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { OccupancyOverview } from "@/components/dashboard/occupancy-overview";
import { RecentDecisions } from "@/components/dashboard/recent-decisions";
import { RoomsStatusGrid } from "@/components/dashboard/rooms-status-grid";
import { useAppData } from "@/components/layout/app-data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { MOCK_NOW } from "@/data/rooms";
import { formatDateTime } from "@/lib/format";

export default function Page() {
  const { rooms, mockEnabled } = useAppData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral em tempo real das salas, do consumo e das decisões da IA."
        actions={
          mockEnabled ? (
            <Badge variant="outline" className="gap-2 py-1">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Simulado · {formatDateTime(MOCK_NOW)}
            </Badge>
          ) : (
            <Badge variant="outline" className="py-1">
              Dados reais
            </Badge>
          )
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Nenhuma sala cadastrada"
          description="Com os dados simulados desligados, o dashboard mostra só o que você cadastrou. Cadastre as salas para começar, ou ative os dados simulados na barra lateral."
          action={
            <Link href="/salas" className={buttonVariants({ size: "sm" })}>
              Ir para Salas
            </Link>
          }
        />
      ) : (
        <>
          <KpiCards />

          <div className="grid gap-6 lg:grid-cols-3">
            <ConsumptionChart className="lg:col-span-2" />
            <OccupancyOverview />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <RoomsStatusGrid className="xl:col-span-2" />
            <RecentDecisions />
          </div>
        </>
      )}
    </div>
  );
}