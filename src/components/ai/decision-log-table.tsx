import Link from "next/link";

import { ACTION_ICON, TRIGGER_ICON } from "@/components/ai/decision-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRoomById } from "@/data/rooms";
import { AI_ACTION_LABEL, AI_TRIGGER_LABEL } from "@/lib/constants";
import { formatKwh, formatTime } from "@/lib/format";
import type { AIDecision } from "@/types";

export function DecisionLogTable({ decisions }: { decisions: AIDecision[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Horário</TableHead>
            <TableHead>Sala</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead className="min-w-[280px]">Motivo</TableHead>
            <TableHead className="text-right">Confiança</TableHead>
            <TableHead className="text-right">Economia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decisions.map((decision) => {
            const ActionIcon = ACTION_ICON[decision.action];
            const TriggerIcon = TRIGGER_ICON[decision.trigger];
            const roomName = getRoomById(decision.roomId)?.name ?? decision.roomId;

            return (
              <TableRow key={decision.id}>
                <TableCell className="whitespace-nowrap font-medium">{formatTime(decision.timestamp)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link href={`/salas/${decision.roomId}`} className="hover:underline">
                    {roomName}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <ActionIcon className="size-4 text-primary" aria-hidden />
                    {AI_ACTION_LABEL[decision.action]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1 whitespace-nowrap">
                    <TriggerIcon className="size-3" aria-hidden />
                    {AI_TRIGGER_LABEL[decision.trigger]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{decision.reason}</TableCell>
                <TableCell className="text-right">{Math.round(decision.confidence * 100)}%</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  {decision.estimatedSavingKwh > 0 ? (
                    <span className="text-success">{formatKwh(decision.estimatedSavingKwh)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}