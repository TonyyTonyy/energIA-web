"use client";

import { useState } from "react";
import { BellRing, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { SwitchRow } from "@/components/settings/automation-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface NotificationConfig {
  channels: { panel: boolean; email: boolean; mobile: boolean };
  events: {
    equipmentFailure: boolean;
    relocation: boolean;
    wasteDetected: boolean;
    dailySummary: boolean;
    goalReached: boolean;
    newPattern: boolean;
  };
  email: string;
  summaryTime: string;
}

const DEFAULT_CONFIG: NotificationConfig = {
  channels: { panel: true, email: true, mobile: false },
  events: {
    equipmentFailure: true,
    relocation: true,
    wasteDetected: true,
    dailySummary: true,
    goalReached: false,
    newPattern: false,
  },
  email: "manutencao@faculdade.example",
  summaryTime: "18:00",
};

const CHANNELS: { key: keyof NotificationConfig["channels"]; title: string; description: string }[] = [
  { key: "panel", title: "No painel", description: "Alertas dentro do próprio EnergIA." },
  { key: "email", title: "E-mail", description: "Envia para o endereço informado abaixo." },
  { key: "mobile", title: "Mensagem no celular", description: "SMS ou aplicativo de mensagens." },
];

const EVENTS: { key: keyof NotificationConfig["events"]; title: string; description: string }[] = [
  {
    key: "equipmentFailure",
    title: "Falha em equipamento",
        description: "Quando um ar-condicionado deixa de responder aos comandos.",
  },
  {
    key: "relocation",
    title: "Aula precisa de remanejamento",
    description: "Quando uma sala fica indisponível perto do início da aula.",
  },
  {
    key: "wasteDetected",
    title: "Equipamento ligado em sala vazia",
    description: "Quando a IA não consegue desligar após o tempo de ausência configurado.",
  },
  {
    key: "dailySummary",
    title: "Resumo diário de economia",
    description: "Quanto foi economizado no dia, em kWh e em reais.",
  },
  {
    key: "goalReached",
    title: "Meta de economia atingida",
    description: "Quando a economia do mês passa da meta definida pela gestão.",
  },
  {
    key: "newPattern",
    title: "Novo padrão aprendido",
    description: "Quando a IA identifica um novo padrão de uso das salas.",
  },
];

const SUMMARY_TIMES = ["07:00", "12:00", "18:00", "22:00"];

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

export function NotificationSettings({ className }: { className?: string }) {
  const [saved, setSaved] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<NotificationConfig>(DEFAULT_CONFIG);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const isDefault = JSON.stringify(draft) === JSON.stringify(DEFAULT_CONFIG);
  const emailInvalid = draft.channels.email && !/^\S+@\S+\.\S+$/.test(draft.email);

  function setChannel(key: keyof NotificationConfig["channels"], value: boolean) {
    setDraft((prev) => ({ ...prev, channels: { ...prev.channels, [key]: value } }));
  }

  function setEvent(key: keyof NotificationConfig["events"], value: boolean) {
    setDraft((prev) => ({ ...prev, events: { ...prev.events, [key]: value } }));
  }

  function handleSave() {
    setSaved(draft);
    toast.success("Preferências de notificação salvas", {
      description: "Simulação: nenhuma mensagem real será enviada.",
    });
  }

  function handleReset() {
    setDraft(DEFAULT_CONFIG);
    toast.info("Valores padrão restaurados", { description: "Clique em salvar para confirmar." });
  }

  function handleTest() {
    const active = CHANNELS.filter((c) => draft.channels[c.key]).map((c) => c.title);
    if (active.length === 0) {
      toast.error("Nenhum canal ativo", { description: "Ative ao menos um canal para receber notificações." });
      return;
    }
    toast.info("Notificação de teste enviada (simulação)", { description: `Canais: ${active.join(", ")}.` });
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>Quais alertas a equipe de gestão e manutenção recebe, e por onde</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <SectionLabel>Canais</SectionLabel>
          {CHANNELS.map((channel) => (
            <SwitchRow
              key={channel.key}
              id={`channel-${channel.key}`}
              title={channel.title}
              description={channel.description}
              checked={draft.channels[channel.key]}
              onCheckedChange={(checked) => setChannel(channel.key, checked)}
            />
          ))}

          <div className="space-y-2 pt-1">
            <Label htmlFor="notify-email">E-mail para alertas</Label>
            <Input
              id="notify-email"
              type="email"
              value={draft.email}
              disabled={!draft.channels.email}
              aria-invalid={emailInvalid}
              onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="nome@faculdade.edu.br"
            />
            {emailInvalid && <p className="text-xs text-danger">Informe um e-mail válido.</p>}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <SectionLabel>Quando avisar</SectionLabel>
          {EVENTS.map((event) => (
            <SwitchRow
              key={event.key}
              id={`event-${event.key}`}
              title={event.title}
              description={event.description}
              checked={draft.events[event.key]}
              onCheckedChange={(checked) => setEvent(event.key, checked)}
            />
          ))}

          <div className="space-y-2 pt-1">
            <Label htmlFor="summary-time">Horário do resumo diário</Label>
            <Select
              value={draft.summaryTime}
              disabled={!draft.events.dailySummary}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, summaryTime: value }))}
            >
              <SelectTrigger id="summary-time" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Horário" />
              </SelectTrigger>
              <SelectContent>
                {SUMMARY_TIMES.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <Button variant="outline" className="w-full" onClick={handleTest}>
          <BellRing className="size-4" aria-hidden />
          Enviar notificação de teste
        </Button>
      </CardContent>

      <CardFooter className="flex-wrap justify-end gap-2 border-t">
        <Button variant="ghost" size="sm" disabled={isDefault} onClick={handleReset}>
          <RotateCcw className="size-4" aria-hidden />
          Restaurar padrões
        </Button>
        <Button size="sm" disabled={!dirty || emailInvalid} onClick={handleSave}>
          <Save className="size-4" aria-hidden />
          Salvar alterações
        </Button>
      </CardFooter>
    </Card>
  );
}