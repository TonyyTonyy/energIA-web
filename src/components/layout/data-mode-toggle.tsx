"use client";

import { Database, FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { useAppData } from "@/components/layout/app-data-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function DataModeToggle() {
  const { ready, mockEnabled, setMockEnabled, userRoomCount, userEventCount } = useAppData();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  function change(enabled: boolean) {
    setMockEnabled(enabled);
    if (enabled) {
      toast.info("Dados simulados ativados", {
        description: "Modo protótipo: as telas mostram dados de exemplo. O que você cadastrou continua guardado.",
      });
    } else {
      toast.info("Dados simulados desativados", {
        description: "Modo real: as telas mostram só o que você cadastrar.",
      });
    }
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!ready}
            onClick={() => change(!mockEnabled)}
            aria-label={mockEnabled ? "Desativar dados simulados" : "Ativar dados simulados"}
          >
            {mockEnabled ? (
              <FlaskConical className="size-4 text-warning" aria-hidden />
            ) : (
              <Database className="size-4 text-success" aria-hidden />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {mockEnabled ? "Dados simulados ligados" : "Modo real (dados cadastrados)"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-sidebar-accent/40 p-3">
      <div className="flex items-start justify-between gap-1">
        <div className="space-y-0.5">
          <Label htmlFor="mock-data-switch" className="flex items-center gap-1.5 text-sm font-medium">
            Dados simulados
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {mockEnabled
              ? "Modo protótipo: as telas mostram dados de exemplo."
              : "Modo real: só o que você cadastrar."}
          </p>
        </div>
        <Switch id="mock-data-switch" checked={mockEnabled} disabled={!ready} onCheckedChange={change} />
      </div>

      {!mockEnabled && (
        <p className="text-xs text-muted-foreground">
          {plural(userRoomCount, "sala", "salas")} · {plural(userEventCount, "aula", "aulas")} cadastradas
        </p>
      )}
    </div>
  );
}