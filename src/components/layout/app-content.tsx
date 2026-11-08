"use client";

import { Fragment, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Telas que ainda só funcionam com dados simulados. A Fase 3 tira "/agenda" desta lista. */
const MOCK_ONLY: Record<string, { title: string; message: string }> = {
    "/agenda": {
    title: "Agenda",
    message:
      "A agenda com cadastro de aulas ainda não está disponível com dados reais. Por enquanto ela só existe com os dados simulados.",
  },
  "/decisoes-ia": {
    title: "Decisões da IA",
    message:
      "O log de decisões e os padrões aprendidos dependem de sensores e histórico, que ainda não existem com dados reais. Use os dados simulados ou o Laboratório IA.",
  },
  "/economia": {
    title: "Economia",
    message:
      "A economia é calculada a partir do consumo medido, que ainda não existe com dados reais. Use os dados simulados para ver esta tela.",
  },
  "/assistente": {
    title: "Assistente",
    message:
      "O assistente responde com base nos dados do sistema. Com dados reais ainda não há o que consultar, então ele só funciona com os dados simulados.",
  },
};

function findMockOnly(pathname: string) {
  const key = Object.keys(MOCK_ONLY).find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return key ? MOCK_ONLY[key] : undefined;
}

function ContentSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function AppContent({ children }: { children: ReactNode }) {
  const { ready, mockEnabled, setMockEnabled } = useAppData();
  const pathname = usePathname();

  if (!ready) return <ContentSkeleton />;

  const blocked = !mockEnabled ? findMockOnly(pathname) : undefined;
  if (blocked) {
    return (
      <div className="space-y-6">
        <PageHeader title={blocked.title} />
        <EmptyState
          icon={FlaskConical}
          title="Tela disponível só com dados simulados"
          description={blocked.message}
          action={
            <Button size="sm" onClick={() => setMockEnabled(true)}>
              Ativar dados simulados
            </Button>
          }
        />
      </div>
    );
  }

  // A chave remonta a tela ao alternar o modo, para zerar filtros e estados locais.
  return <Fragment key={mockEnabled ? "mock" : "real"}>{children}</Fragment>;
}