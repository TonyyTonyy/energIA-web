"use client";

import { BrainCircuit } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AI_ACTION_LABEL, AI_TRIGGER_LABEL } from "@/lib/constants";
import { formatKwh, formatTime } from "@/lib/format";

export function RoomHistoryTable({ roomId, className }: { roomId: string; className?: string }) {
  const { decisions } = useAppData();

  const items = decisions
    .filter((decision) => decision.roomId === roomId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Histórico de decisões da IA</CardTitle>
        <CardDescription>
          {items.length > 0
            ? `${items.length} ${items.length === 1 ? "decisão" : "decisões"} hoje nesta sala`
            : "O que a IA decidiu nesta sala hoje"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="Nenhuma decisão registrada hoje"
            description="A IA ainda não precisou intervir nesta sala."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="min-w-[260px]">Motivo</TableHead>
                <TableHead className="text-right">Confiança</TableHead>
                <TableHead className="text-right">Economia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((decision) => (
                <TableRow key={decision.id}>
                  <TableCell className="whitespace-nowrap font-medium">{formatTime(decision.timestamp)}</TableCell>
                  <TableCell className="whitespace-nowrap">{AI_ACTION_LABEL[decision.action]}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{AI_TRIGGER_LABEL[decision.trigger]}</Badge>
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
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}