"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, SearchX, SlidersHorizontal, Thermometer, Trash2 } from "lucide-react";

import { useAppData } from "@/components/layout/app-data-provider";
import { RoomDetailHeader } from "@/components/rooms/room-detail-header";
import { RoomEquipmentControls } from "@/components/rooms/room-equipment-controls";
import { RoomHistoryTable } from "@/components/rooms/room-history-table";
import { RoomTemperatureChart } from "@/components/rooms/room-temperature-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoomDialogs } from "@/hooks/use-room-dialogs";
import { hasSensors } from "@/lib/room-utils";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function RoomDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { getRoomById, mockEnabled, canEdit } = useAppData();
  const dialogs = useRoomDialogs({ onDeleted: () => router.replace("/salas") });

  const roomId = safeDecode(id);
  const room = getRoomById(roomId);

  if (!room) {
    return (
      <EmptyState
        icon={SearchX}
        title="Sala não encontrada"
        description={`Não existe sala com o código ${roomId}${mockEnabled ? "" : " nos dados cadastrados"}.`}
        action={
          <Link href="/salas" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Voltar para salas
          </Link>
        }
      />
    );
  }

  const sensors = hasSensors(room);

  return (
    <div className="space-y-6">
      <RoomDetailHeader
        room={room}
        actions={
          canEdit ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => dialogs.openEdit(room)}>
                <Pencil className="size-4" aria-hidden />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => dialogs.openDelete(room)}>
                <Trash2 className="size-4" aria-hidden />
                Excluir
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {sensors && mockEnabled ? (
          <RoomTemperatureChart room={room} className="lg:col-span-2" />
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Temperatura da sala</CardTitle>
              <CardDescription>Histórico dos sensores</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Thermometer}
                title="Sem sensores conectados"
                description="O histórico de temperatura aparece quando a sala tiver sensores conectados."
              />
            </CardContent>
          </Card>
        )}

        {sensors ? (
          <RoomEquipmentControls key={room.id} room={room} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Controles</CardTitle>
              <CardDescription>Ar-condicionado e iluminação</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={SlidersHorizontal}
                title="Sem automação conectada"
                description="Os controles aparecem quando a sala tiver equipamentos conectados."
              />
            </CardContent>
          </Card>
        )}
      </div>

      <RoomHistoryTable roomId={room.id} />

      {dialogs.element}
    </div>
  );
}