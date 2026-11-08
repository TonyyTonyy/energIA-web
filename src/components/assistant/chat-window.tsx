"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, RotateCcw } from "lucide-react";

import { ChatInput } from "@/components/assistant/chat-input";
import { ChatMessage, TypingIndicator } from "@/components/assistant/chat-message";
import { SuggestedPrompts } from "@/components/assistant/suggested-prompts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chatSeedMessages } from "@/data/chat";
import { getAssistantReply, mockTimestamp } from "@/lib/assistant";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageData } from "@/types";

export function ChatWindow({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessageData[]>(chatSeedMessages);
  const [typing, setTyping] = useState(false);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Limpa o timer pendente ao sair da tela
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Rola até a última mensagem
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function handleSend(text: string) {
    const content = text.trim();
    if (!content || typing) return;

    counter.current += 1;
    const n = counter.current;
    const createdAt = mockTimestamp(n);

    setMessages((prev) => [...prev, { id: `user-${n}`, role: "user", content, createdAt }]);
    setTyping(true);

    const delay = 600 + Math.min(content.length * 10, 600);
    timer.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${n}`, role: "assistant", content: getAssistantReply(content), createdAt },
      ]);
      setTyping(false);
    }, delay);
  }

  function handleReset() {
    if (timer.current) clearTimeout(timer.current);
    counter.current = 0;
    setTyping(false);
    setMessages(chatSeedMessages);
  }

  return (
    <Card className={cn("h-[calc(100svh-17rem)] min-h-[520px] w-full gap-0 overflow-hidden py-0", className)}>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">Assistente EnergIA</p>
          <p className="text-xs text-muted-foreground">Consulta os dados do sistema em linguagem natural</p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          Respostas simuladas
        </Badge>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="size-4" aria-hidden />
          Nova conversa
        </Button>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {typing && <TypingIndicator />}
      </div>

      <div className="space-y-3 border-t px-4 py-3">
        <SuggestedPrompts onSelect={handleSend} disabled={typing} />
        <ChatInput onSend={handleSend} disabled={typing} />
        <p className="text-[11px] text-muted-foreground">
          Assistente simulado: as respostas vêm dos dados de exemplo do protótipo. Ele só consulta informações e
          não substitui o sistema de agendamento de aulas.
        </p>
      </div>
    </Card>
  );
}