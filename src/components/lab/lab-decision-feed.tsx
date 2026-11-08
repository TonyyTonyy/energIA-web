import { ACTION_ICON, TRIGGER_ICON } from "@/components/ai/decision-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AI_ACTION_LABEL, AI_TRIGGER_LABEL } from "@/lib/constants";
import { formatKwh } from "@/lib/format";
import type { LabDecision } from "@/lib/ml/engine";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

export function LabDecisionFeed({ decisions, className }: { decisions: LabDecision[]; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Decisões em tempo real</CardTitle>
        <CardDescription>Cada decisão traz o motivo e a probabilidade que o modelo usou</CardDescription>
      </CardHeader>
      <CardContent>
        {decisions.length === 0 ? (
          <EmptyState icon={BrainCircuit} title="Nenhuma decisão ainda" description="Inicie a simulação para ver a IA agindo." />
        ) : (
          <ScrollArea className="h-[560px] pr-3">
            <ul className="space-y-4">
              {decisions.map((d) => {
                const Icon = ACTION_ICON[d.action];
                const TriggerIcon = TRIGGER_ICON[d.trigger];
                return (
                  <li key={d.id} className="flex gap-3">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        d.anomaly ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {d.roomName} · {AI_ACTION_LABEL[d.action]}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">{d.clock}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.reason}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <TriggerIcon className="size-3" aria-hidden />
                          {AI_TRIGGER_LABEL[d.trigger]}
                        </Badge>
                        {d.probability !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            P(ocupação) = {Math.round(d.probability * 100)}%
                          </span>
                        )}
                        {d.savingKwh !== undefined && d.savingKwh > 0 && (
                          <span className="text-xs text-success">economia de {formatKwh(d.savingKwh)}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}