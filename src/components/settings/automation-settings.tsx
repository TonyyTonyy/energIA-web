"use client";

import { useState } from "react";
import { Pause, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { useAppData } from "@/components/layout/app-data-provider";
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
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TARIFF_BRL_PER_KWH } from "@/lib/constants";
import { formatBRL, formatTemp } from "@/lib/format";
import { hasSensors } from "@/lib/room-utils";
import { formatDuration } from "@/lib/simulation";

interface AutomationConfig {
  enabled: boolean;
  controlAc: boolean;
  controlLights: boolean;
  learnPatterns: boolean;
  useSeason: boolean;
  targetTemperature: number;
  maxPreCoolMinutes: number;
  vacancyMinutes: number;
  minGapMinutes: number;
  /** Blocos com a automação desligada (vazio = todos ligados). Sempre ordenado. */
  disabledBlocks: string[];
}

const DEFAULT_CONFIG: AutomationConfig = {
  enabled: true,
  controlAc: true,
  controlLights: true,
  learnPatterns: true,
  useSeason: true,
  targetTemperature: 23,
  maxPreCoolMinutes: 60,
  vacancyMinutes: 10,
  minGapMinutes: 90,
  disabledBlocks: [],
};

interface SwitchRowProps {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Linha com título, descrição e switch. Também usada em notification-settings.tsx. */
export function SwitchRow({ id, title, description, checked, onCheckedChange, disabled }: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {title}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

interface SliderRowProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function SliderRow({ id, label, hint, value, display, min, max, step, disabled, onChange }: SliderRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums">{display}</span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={([next]) => onChange(next)}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

export function AutomationSettings({ className }: { className?: string }) {
  const { rooms } = useAppData();
  const [saved, setSaved] = useState<AutomationConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<AutomationConfig>(DEFAULT_CONFIG);

  const blocks = Array.from(new Set(rooms.map((r) => r.block))).sort();

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const isDefault = JSON.stringify(draft) === JSON.stringify(DEFAULT_CONFIG);
  const locked = !draft.enabled;

  const update = <K extends keyof AutomationConfig>(key: K, value: AutomationConfig[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  function toggleBlock(block: string, enabled: boolean) {
    const rest = draft.disabledBlocks.filter((b) => b !== block);
    update("disabledBlocks", enabled ? rest : [...rest, block].sort());
  }

  function handleSave() {
    setSaved(draft);
    toast.success("Configurações de automação salvas", {
      description: "Simulação: nenhum equipamento real foi alterado.",
    });
  }

  function handleReset() {
    setDraft(DEFAULT_CONFIG);
    toast.info("Valores padrão restaurados", { description: "Clique em salvar para confirmar." });
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Automação da IA</CardTitle>
        <CardDescription>Como o sistema decide ligar e desligar ar-condicionado e luzes</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-4">
            <SwitchRow
              id="auto-enabled"
              title="Automação por IA"
              description="Quando desligada, a IA não aciona nenhum equipamento."
              checked={draft.enabled}
              onCheckedChange={(checked) => update("enabled", checked)}
            />
          </div>
          {locked && (
            <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <Pause className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                Automação pausada: a IA não liga nem desliga nenhum equipamento e as salas voltam ao controle
                manual.
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <SectionLabel>Equipamentos e aprendizado</SectionLabel>
          <SwitchRow
            id="control-ac"
            title="Controlar ar-condicionado"
            checked={draft.controlAc}
            disabled={locked}
            onCheckedChange={(checked) => update("controlAc", checked)}
          />
          <SwitchRow
            id="control-lights"
            title="Controlar iluminação"
            checked={draft.controlLights}
            disabled={locked}
            onCheckedChange={(checked) => update("controlLights", checked)}
          />
          <SwitchRow
            id="learn-patterns"
            title="Aprender padrões de uso"
            description="Usa o histórico para prever horários em que as salas ficam vazias."
            checked={draft.learnPatterns}
            disabled={locked}
            onCheckedChange={(checked) => update("learnPatterns", checked)}
          />
          <SwitchRow
            id="use-season"
            title="Considerar a estação do ano"
            description="Ajusta a antecedência do ar conforme o calor externo."
            checked={draft.useSeason}
            disabled={locked}
            onCheckedChange={(checked) => update("useSeason", checked)}
          />
        </div>

        <Separator />

        <div className="space-y-6">
          <SectionLabel>Regras de decisão</SectionLabel>
          <SliderRow
            id="target-temp"
            label="Temperatura alvo padrão"
            hint="Temperatura desejada no início das aulas."
            value={draft.targetTemperature}
            display={formatTemp(draft.targetTemperature)}
            min={20}
            max={26}
            step={0.5}
            disabled={locked}
            onChange={(value) => update("targetTemperature", value)}
          />
          <SliderRow
            id="max-precool"
            label="Antecedência máxima do pré-resfriamento"
            hint="Quanto antes da aula a IA pode ligar o ar."
            value={draft.maxPreCoolMinutes}
            display={formatDuration(draft.maxPreCoolMinutes / 60)}
            min={15}
            max={90}
            step={5}
            disabled={locked}
            onChange={(value) => update("maxPreCoolMinutes", value)}
          />
          <SliderRow
            id="vacancy"
            label="Tempo sem presença para desligar"
            hint="Quanto a sala precisa ficar vazia antes de a IA desligar ar e luzes."
            value={draft.vacancyMinutes}
            display={formatDuration(draft.vacancyMinutes / 60)}
            min={5}
            max={30}
            step={5}
            disabled={locked}
            onChange={(value) => update("vacancyMinutes", value)}
          />
          <SliderRow
            id="min-gap"
            label="Intervalo mínimo para desligar e religar"
            hint="Abaixo disso, a IA mantém o ar ligado porque desligar não compensa."
            value={draft.minGapMinutes}
            display={formatDuration(draft.minGapMinutes / 60)}
            min={30}
            max={180}
            step={15}
            disabled={locked}
            onChange={(value) => update("minGapMinutes", value)}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <SectionLabel>Automação por bloco</SectionLabel>
          {blocks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma sala cadastrada. Cadastre salas para configurar a automação de cada bloco.
            </p>
          ) : (
            blocks.map((block) => {
              const blockRooms = rooms.filter((r) => r.block === block);
              const broken = blockRooms.filter((r) => r.hasIssue).length;
              const noSensor = blockRooms.filter((r) => !hasSensors(r)).length;
              const parts = [
                `${blockRooms.length} ${blockRooms.length === 1 ? "sala" : "salas"}`,
                broken > 0 ? `${broken} com falha no ar-condicionado` : null,
                noSensor > 0 ? `${noSensor} sem sensor` : null,
              ].filter(Boolean);

              return (
                <SwitchRow
                  key={block}
                  id={`block-${block}`}
                  title={block}
                  description={parts.join(" · ")}
                  checked={!draft.disabledBlocks.includes(block)}
                  disabled={locked}
                  onCheckedChange={(checked) => toggleBlock(block, checked)}
                />
              );
            })
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="tariff">Tarifa de energia</Label>
          <Input id="tariff" readOnly disabled value={`${formatBRL(TARIFF_BRL_PER_KWH)} por kWh`} />
          <p className="text-xs text-muted-foreground">
            Usada nos cálculos de economia. Valor fixo no protótipo.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex-wrap justify-end gap-2 border-t">
        <Button variant="ghost" size="sm" disabled={isDefault} onClick={handleReset}>
          <RotateCcw className="size-4" aria-hidden />
          Restaurar padrões
        </Button>
        <Button size="sm" disabled={!dirty} onClick={handleSave}>
          <Save className="size-4" aria-hidden />
          Salvar alterações
        </Button>
      </CardFooter>
    </Card>
  );
}