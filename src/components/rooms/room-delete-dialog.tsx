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
import type { Room } from "@/types";

interface RoomDeleteDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RoomDeleteDialog({ room, open, onOpenChange, onConfirm }: RoomDeleteDialogProps) {
  const { scheduleEvents } = useAppData();
  const eventCount = room ? scheduleEvents.filter((e) => e.roomId === room.id).length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir {room?.name ?? "sala"}?</DialogTitle>
          <DialogDescription>
            {eventCount > 0
              ? `${eventCount} ${eventCount === 1 ? "aula cadastrada nesta sala também será excluída" : "aulas cadastradas nesta sala também serão excluídas"}. `
              : ""}
            Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Excluir sala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}