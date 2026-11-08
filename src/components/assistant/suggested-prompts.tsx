"use client";

import { Button } from "@/components/ui/button";

const PROMPTS = [
  "Quanto economizamos hoje?",
  "Há salas vazias com equipamento ligado?",
  "Quais salas estão com problema?",
  "Quais aulas começam em breve?",
  "Por que a IA desligou o ar da A-201?",
  "Vale a pena desligar o ar por 3 horas?",
  "O que a IA aprendeu até agora?",
];

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Sugestões de perguntas">
      {PROMPTS.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="h-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-normal"
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}