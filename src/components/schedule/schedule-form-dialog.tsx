"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";

import { useAppData } from "@/components/layout/app-data-provider";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WEEKDAY_LABEL } from "@/lib/constants";
import {
  SCHEDULE_LIMITS,
  buildEvents,
  emptyEventForm,
  eventToForm,
  seriesOf,
  validateEventForm,
  weekdaysLabel,
  type EventFormErrors,
  type EventFormValues,
} from "@/lib/schedule-form";
import { WEEKDAYS } from "@/lib/schedule-utils";
import type { ScheduleEvent, Weekday } from "@/types";

function EventForm({ series, onDone }: { series: ScheduleEvent[] | null; onDone: () => void }) {
  const { rooms, scheduleEvents, replaceEvents } = useAppData();
  const editing = series !== null;
  const [values, setValues] = useState<EventFormValues>(() => (series ? eventToForm(series) : emptyEventForm()));
  const [errors, setErrors] = useState<EventFormErrors>({});

  const teachers = Array.from(new Set(scheduleEvents.map((e) => e.teacher))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  function patch<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, conflicts: undefined }));
  }

  const onText = (key: "course" | "teacher" | "start" | "end") => (e: ChangeEvent<HTMLInputElement>) =>
    patch(key, e.target.value);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ignore = new Set((series ?? []).map((ev) => ev.id));
    const result = validateEventForm(values, rooms, scheduleEvents, ignore);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const input = result.value;
    const { remove, add } = buildEvents(input, series ?? []);
    replaceEvents(remove, add);

    const roomName = rooms.find((r) => r.id === input.roomId)?.name ?? input.roomId;
    toast.success(editing ? "Aula atualizada" : "Aula cadastrada", {
      description: `${input.course} · ${roomName} · ${weekdaysLabel(input.weekdays)} · ${input.start}–${input.end}`,
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="event-course" label="Disciplina" error={errors.course}>
          <Input
            id="event-course"
            value={values.course}
            onChange={onText("course")}
            maxLength={SCHEDULE_LIMITS.textMax}
            placeholder="Cálculo I"
            autoComplete="off"
            aria-invalid={Boolean(errors.course)}
            aria-describedby={errors.course ? "event-course-error" : undefined}
          />
        </FormField>

        <FormField id="event-teacher" label="Professor" error={errors.teacher}>
          <Input
            id="event-teacher"
            list="event-teachers"
            value={values.teacher}
            onChange={onText("teacher")}
            maxLength={SCHEDULE_LIMITS.textMax}
            placeholder="Prof. Helena Prado"
            autoComplete="off"
            aria-invalid={Boolean(errors.teacher)}
            aria-describedby={errors.teacher ? "event-teacher-error" : undefined}
          />
          <datalist id="event-teachers">
            {teachers.map((teacher) => (
              <option key={teacher} value={teacher} />
            ))}
          </datalist>
        </FormField>
      </div>

      <FormField id="event-room" label="Sala" error={errors.roomId}>
        <Select value={values.roomId} onValueChange={(roomId) => patch("roomId", roomId)}>
          <SelectTrigger
            id="event-room"
            className="w-full"
            aria-invalid={Boolean(errors.roomId)}
            aria-describedby={errors.roomId ? "event-room-error" : undefined}
          >
            <SelectValue placeholder="Escolha a sala" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name} · {room.block}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="space-y-1.5">
        <Label>Dias da semana</Label>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={values.weekdays.map(String)}
          onValueChange={(selected) =>
            patch("weekdays", selected.map(Number).sort((a, b) => a - b) as Weekday[])
          }
          className="flex-wrap justify-start"
        >
          {WEEKDAYS.map((day) => (
            <ToggleGroupItem key={day} value={String(day)} aria-label={WEEKDAY_LABEL[day]}>
              {WEEKDAY_LABEL[day].slice(0, 3)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {errors.weekdays ? (
          <p className="text-xs text-danger">{errors.weekdays}</p>
        ) : (
          <p className="text-xs text-muted-foreground">A aula se repete nos dias marcados.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="event-start" label="Início" error={errors.start}>
          <Input
            id="event-start"
            type="time"
            step={300}
            value={values.start}
            onChange={onText("start")}
            aria-invalid={Boolean(errors.start)}
            aria-describedby={errors.start ? "event-start-error" : undefined}
          />
        </FormField>

        <FormField id="event-end" label="Término" error={errors.end}>
          <Input
            id="event-end"
            type="time"
            step={300}
            value={values.end}
            onChange={onText("end")}
            aria-invalid={Boolean(errors.end)}
            aria-describedby={errors.end ? "event-end-error" : undefined}
          />
        </FormField>
      </div>

      {errors.conflicts && errors.conflicts.length > 0 && (
        <div role="alert" className="space-y-1 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <p className="font-medium">Conflito de horário</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {errors.conflicts.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">{editing ? "Salvar alterações" : "Cadastrar aula"}</Button>
      </DialogFooter>
    </form>
  );
}

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = cadastrar aula nova; lista = editar (todas as ocorrências da aula). */
  series: ScheduleEvent[] | null;
}

export function ScheduleFormDialog({ open, onOpenChange, series }: ScheduleFormDialogProps) {
  const editing = series !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar aula" : "Cadastrar aula"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "As alterações valem para todos os dias desta aula. Para tirar um dia, desmarque-o."
              : "A mesma aula pode se repetir em vários dias. O sistema avisa se a sala ou o professor já estiverem ocupados."}
          </DialogDescription>
        </DialogHeader>
        {/* O formulário só existe com o diálogo aberto, então o estado reinicia a cada abertura. */}
        <EventForm
          key={series ? seriesOf(series[0]) : "new"}
          series={series}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}