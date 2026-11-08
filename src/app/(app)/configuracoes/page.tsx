import { Info } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AutomationSettings } from "@/components/settings/automation-settings";
import { DataManagement } from "@/components/settings/data-management";
import { NotificationSettings } from "@/components/settings/notification-settings";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Ajuste como a IA controla os equipamentos, quais alertas a equipe recebe e os dados cadastrados."
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <AutomationSettings />
        <NotificationSettings />
      </div>

      <DataManagement />

      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Protótipo: as configurações de automação e de notificação ficam apenas nesta tela e não alteram os
          cálculos das outras telas nem nenhum equipamento real. Os dados cadastrados (salas e aulas) ficam
          guardados neste navegador.
        </span>
      </p>
    </div>
  );
}