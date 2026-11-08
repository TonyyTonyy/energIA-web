"use client";

import { useAppData } from "@/components/layout/app-data-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { weekdaysLabel } from "@/lib/schedule-form";
import type { ScheduleEvent } from "@/types";

interface ScheduleDeleteDialogProps {
  series: ScheduleEvent[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ScheduleDeleteDialog({ series, open, onOpenChange, onConfirm }: ScheduleDeleteDialogProps) {
  const { getRoomById } = useAppData();
  const first = series?.[0];
  const roomName = first ? (getRoomById(first.roomId)?.name ?? first.roomId) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir {first?.course ?? "aula"}?</DialogTitle>
          <DialogDescription>
            {first && series
              ? `A aula de ${first.course} (${roomName}, ${first.start}–${first.end}) será excluída de ${series.length === 1 ? "1 dia" : `${series.length} dias`}: ${weekdaysLabel(series.map((e) => e.weekday))}. `
              : ""}
            Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Excluir aula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}