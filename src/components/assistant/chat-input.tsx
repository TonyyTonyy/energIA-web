"use client";

import { useState, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Pergunte sobre salas, consumo, economia…"
        aria-label="Mensagem para o assistente"
        className="max-h-32 min-h-10 resize-none"
      />
      <Button
        type="button"
        size="icon"
        className="size-10 shrink-0"
        onClick={submit}
        disabled={disabled || value.trim() === ""}
        aria-label="Enviar mensagem"
      >
        <SendHorizontal className="size-4" aria-hidden />
      </Button>
    </div>
  );
}