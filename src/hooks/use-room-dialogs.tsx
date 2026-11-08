"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useAppData } from "@/components/layout/app-data-provider";
import { RoomDeleteDialog } from "@/components/rooms/room-delete-dialog";
import { RoomFormDialog } from "@/components/rooms/room-form-dialog";
import type { Room } from "@/types";

/** Estado dos diálogos de cadastrar, editar e excluir sala. Renderize `element` na tela. */
export function useRoomDialogs(options: { onDeleted?: (room: Room) => void } = {}) {
  const { removeRoom } = useAppData();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(room: Room) {
    setEditing(room);
    setFormOpen(true);
  }

  function openDelete(room: Room) {
    setDeleteTarget(room);
    setDeleteOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const room = deleteTarget;
    removeRoom(room.id);
    setDeleteOpen(false);
    toast.success("Sala excluída", { description: `${room.name} (${room.id})` });
    options.onDeleted?.(room);
  }

  const element = (
    <>
      <RoomFormDialog open={formOpen} onOpenChange={setFormOpen} room={editing} />
      <RoomDeleteDialog
        room={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
      />
    </>
  );

  return { openCreate, openEdit, openDelete, element };
}