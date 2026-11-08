import Link from "next/link";
import { Bot, User } from "lucide-react";

import { getRoomById } from "@/data/rooms";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageData } from "@/types";

/** Transforma ids de sala (ex.: A-101) em links para a página da sala. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/\b([ABC]-\d{3})\b/);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 && getRoomById(part) ? (
          <Link
            key={i}
            href={`/salas/${part}`}
            className="font-medium underline underline-offset-2 hover:text-primary"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
      )}
    >
      {isUser ? <User className="size-4" aria-hidden /> : <Bot className="size-4" aria-hidden />}
    </div>
  );
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-end gap-2.5", isUser && "flex-row-reverse")}>
      <Avatar isUser={isUser} />
      <div className={cn("flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]", isUser && "items-end")}>
        <div
          className={cn(
            "whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {isUser ? message.content : <RichText text={message.content} />}
        </div>
        <span className="px-1 text-[11px] text-muted-foreground">
          {isUser ? "Você" : "EnergIA"} · {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5" role="status" aria-label="O assistente está digitando">
      <Avatar isUser={false} />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}