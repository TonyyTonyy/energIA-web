"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { useAppData } from "@/components/layout/app-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSnapshot } from "@/lib/app-store";
import { MAX_FILE_BYTES, buildExport, parseImport } from "@/lib/data-transfer";
import type { Room, ScheduleEvent } from "@/types";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface PendingImport {
  rooms: Room[];
  events: ScheduleEvent[];
}

export function DataManagement({ className }: { className?: string }) {
  const { mockEnabled, setMockEnabled, userRoomCount, userEventCount, replaceUserData, clearUserData } = useAppData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const hasData = userRoomCount > 0 || userEventCount > 0;
  const summary = `${plural(userRoomCount, "sala", "salas")} · ${plural(userEventCount, "aula", "aulas")}`;

  function handleExport() {
    const data = getSnapshot();
    if (data.rooms.length === 0 && data.events.length === 0) {
      toast.error("Não há dados cadastrados para exportar.");
      return;
    }

    const blob = new Blob([buildExport(data.rooms, data.events)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `energia-dados-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast.success("Arquivo exportado", {
      description: `${plural(data.rooms.length, "sala", "salas")} · ${plural(data.events.length, "aula", "aulas")}`,
    });
  }

  function applyImport(data: PendingImport) {
    replaceUserData(data.rooms, data.events);
    setPending(null);
    toast.success("Dados importados", {
      description: `${plural(data.rooms.length, "sala", "salas")} · ${plural(data.events.length, "aula", "aulas")}`,
      action: mockEnabled
        ? { label: "Desligar dados simulados", onClick: () => setMockEnabled(false) }
        : undefined,
    });
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;

    setErrors(null);
    if (file.size > MAX_FILE_BYTES) {
      setErrors(["O arquivo é grande demais (máximo de 2 MB)."]);
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setErrors(["Não foi possível ler o arquivo."]);
      return;
    }

    const result = parseImport(text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const data = { rooms: result.rooms, events: result.events };
    if (hasData) setPending(data);
    else applyImport(data);
  }

  function handleClear() {
    clearUserData();
    setClearOpen(false);
    toast.success("Dados cadastrados apagados", { description: summary });
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Dados cadastrados</CardTitle>
        <CardDescription>
          Salas e aulas que você cadastrou ficam guardadas neste navegador. Exporte para levar para outro
          computador ou fazer uma cópia de segurança.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="font-medium">{hasData ? summary : "Nenhum dado cadastrado"}</span>
          {mockEnabled && (
            <p className="mt-1 text-xs text-muted-foreground">
              Os dados simulados do protótipo não entram na exportação. Só o que você cadastrou.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!hasData}>
            <Download className="size-4" aria-hidden />
            Exportar JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" aria-hidden />
            Importar JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => setClearOpen(true)} disabled={!hasData}>
            <Trash2 className="size-4" aria-hidden />
            Limpar dados cadastrados
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFile}
            aria-label="Escolher arquivo JSON para importar"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          A importação substitui as salas e aulas cadastradas e confere o arquivo antes: se houver algum problema,
          nada é alterado.
        </p>

        {errors && (
          <div role="alert" className="space-y-1 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="size-3.5" aria-hidden />
              Não foi possível importar o arquivo
            </p>
            <ul className="list-disc space-y-0.5 pl-5">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Substituir os dados cadastrados?</DialogTitle>
            <DialogDescription>
              O arquivo tem {plural(pending?.rooms.length ?? 0, "sala", "salas")} e{" "}
              {plural(pending?.events.length ?? 0, "aula", "aulas")}. Ele vai substituir os {summary} que você
              tem agora. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => pending && applyImport(pending)}>
              Substituir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar todos os dados cadastrados?</DialogTitle>
            <DialogDescription>
              {summary} serão excluídas. Os dados simulados do protótipo não são afetados. Exporte antes se quiser
              guardar uma cópia. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              Apagar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}