"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useAppData } from "@/components/layout/app-data-provider";
import { ScheduleDeleteDialog } from "@/components/schedule/schedule-delete-dialog";
import { ScheduleFormDialog } from "@/components/schedule/schedule-form-dialog";
import { seriesOf } from "@/lib/schedule-form";
import type { ScheduleEvent } from "@/types";

/** Estado dos diálogos de cadastrar, editar e excluir aula. Renderize `element` na tela. */
export function useScheduleDialogs() {
  const { scheduleEvents, replaceEvents } = useAppData();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent[] | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<ScheduleEvent[] | null>(null);

  /** Todas as ocorrências (dias) da aula a que o evento pertence. */
  const seriesFor = (event: ScheduleEvent) => {
    const id = seriesOf(event);
    return scheduleEvents.filter((e) => seriesOf(e) === id);
  };

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(event: ScheduleEvent) {
    setEditing(seriesFor(event));
    setFormOpen(true);
  }

  function openDelete(event: ScheduleEvent) {
    setDeleting(seriesFor(event));
    setDeleteOpen(true);
  }

  function confirmDelete() {
    if (!deleting || deleting.length === 0) return;
    const first = deleting[0];
    replaceEvents(
      deleting.map((e) => e.id),
      [],
    );
    setDeleteOpen(false);
    toast.success("Aula excluída", { description: first.course });
  }

  const element = (
    <>
      <ScheduleFormDialog open={formOpen} onOpenChange={setFormOpen} series={editing} />
      <ScheduleDeleteDialog
        series={deleting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
      />
    </>
  );

  return { openCreate, openEdit, openDelete, element };
}