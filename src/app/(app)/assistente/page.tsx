import { ChatWindow } from "@/components/assistant/chat-window";
import { PageHeader } from "@/components/layout/page-header";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistente"
        description="Pergunte em linguagem natural sobre salas, consumo, economia e decisões da IA. Ele consulta os dados do sistema; não aciona equipamentos nem substitui o sistema de agendamento de aulas."
      />

      <ChatWindow className="mx-auto" />
    </div>
  );
}