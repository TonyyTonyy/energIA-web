"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROOM_LIMITS,
  createRoom,
  emptyRoomForm,
  roomPatch,
  roomToForm,
  validateRoomForm,
  type RoomFormErrors,
  type RoomFormValues,
} from "@/lib/room-utils";
import type { Room } from "@/types";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function RoomForm({ room, onDone }: { room: Room | null; onDone: () => void }) {
  const { rooms, addRoom, updateRoom } = useAppData();
  const [values, setValues] = useState<RoomFormValues>(() => (room ? roomToForm(room) : emptyRoomForm()));
  const [errors, setErrors] = useState<RoomFormErrors>({});
  const blocks = Array.from(new Set(rooms.map((r) => r.block))).sort();

  const onChange = (key: keyof RoomFormValues) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = validateRoomForm(values, rooms, room?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const input = result.value;

    if (room) {
      updateRoom(room.id, roomPatch(input, room));
      toast.success("Sala atualizada", { description: `${input.name} (${input.id})` });
    } else {
      const saved = addRoom(createRoom(input));
      if (!saved.ok) {
        setErrors({ code: saved.error });
        return;
      }
      toast.success("Sala cadastrada", {
        description: `${input.name} (${input.id}) · ${input.block}. Sem sensores por enquanto.`,
      });
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="room-code"
          label="Código"
          error={errors.code}
          hint={room ? "O código não pode ser alterado." : "Ex.: A-101"}
        >
          <Input
            id="room-code"
            value={values.code}
            onChange={onChange("code")}
            disabled={room !== null}
            maxLength={ROOM_LIMITS.codeMax}
            placeholder="A-101"
            autoComplete="off"
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? "room-code-error" : undefined}
          />
        </Field>

        <Field id="room-name" label="Nome" error={errors.name} hint="Opcional. Se vazio: Sala + código.">
          <Input
            id="room-name"
            value={values.name}
            onChange={onChange("name")}
            maxLength={ROOM_LIMITS.nameMax}
            placeholder="Sala A-101"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "room-name-error" : undefined}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="room-block" label="Bloco" error={errors.block}>
          <Input
            id="room-block"
            list="room-blocks"
            value={values.block}
            onChange={onChange("block")}
            maxLength={ROOM_LIMITS.blockMax}
            placeholder="Bloco A"
            autoComplete="off"
            aria-invalid={Boolean(errors.block)}
            aria-describedby={errors.block ? "room-block-error" : undefined}
          />
          <datalist id="room-blocks">
            {blocks.map((block) => (
              <option key={block} value={block} />
            ))}
          </datalist>
        </Field>

        <Field id="room-floor" label="Andar" error={errors.floor} hint="0 = térreo">
          <Input
            id="room-floor"
            type="number"
            inputMode="numeric"
            min={ROOM_LIMITS.floorMin}
            max={ROOM_LIMITS.floorMax}
            step={1}
            value={values.floor}
            onChange={onChange("floor")}
            aria-invalid={Boolean(errors.floor)}
            aria-describedby={errors.floor ? "room-floor-error" : undefined}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="room-capacity" label="Capacidade (pessoas)" error={errors.capacity}>
          <Input
            id="room-capacity"
            type="number"
            inputMode="numeric"
            min={ROOM_LIMITS.capacityMin}
            max={ROOM_LIMITS.capacityMax}
            step={1}
            value={values.capacity}
            onChange={onChange("capacity")}
            aria-invalid={Boolean(errors.capacity)}
            aria-describedby={errors.capacity ? "room-capacity-error" : undefined}
          />
        </Field>

        <Field id="room-target" label="Temperatura alvo (°C)" error={errors.targetTemperature}>
          <Input
            id="room-target"
            inputMode="decimal"
            maxLength={5}
            value={values.targetTemperature}
            onChange={onChange("targetTemperature")}
            aria-invalid={Boolean(errors.targetTemperature)}
            aria-describedby={errors.targetTemperature ? "room-target-error" : undefined}
          />
        </Field>
      </div>

      {!room && (
        <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Salas cadastradas começam sem sensores: temperatura, ocupação e consumo aparecem como &quot;sem sensor&quot;
          até serem conectados.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">{room ? "Salvar alterações" : "Cadastrar sala"}</Button>
      </DialogFooter>
    </form>
  );
}

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = cadastrar sala nova; Room = editar. */
  room: Room | null;
}

export function RoomFormDialog({ open, onOpenChange, room }: RoomFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{room ? `Editar ${room.name}` : "Cadastrar sala"}</DialogTitle>
          <DialogDescription>
            {room
              ? "Altere os dados da sala. O código identifica a sala nas aulas e não pode mudar."
              : "Informe os dados da sala. Ela fica guardada neste navegador."}
          </DialogDescription>
        </DialogHeader>
        {/* O formulário só existe com o diálogo aberto, então o estado reinicia a cada abertura. */}
        <RoomForm key={room?.id ?? "new"} room={room} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}