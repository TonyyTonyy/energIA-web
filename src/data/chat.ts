import type { ChatMessage } from "@/types";

export const chatSeedMessages: ChatMessage[] = [
  {
    id: "seed-1",
    role: "assistant",
    content:
      "Olá! Sou o assistente do EnergIA. Consulto os dados das salas, da agenda e das decisões da IA e respondo em linguagem natural. Pergunte, por exemplo, quanto economizamos hoje ou por que uma sala foi desligada.",
    createdAt: "2026-11-06T18:38:00",
  },
  {
    id: "seed-2",
    role: "user",
    content: "Tem alguma sala com problema agora?",
    createdAt: "2026-11-06T18:39:00",
  },
  {
    id: "seed-3",
    role: "assistant",
    content:
      "Sim, 1 sala está com problema.\nSala B-201: Ar-condicionado não responde aos comandos (possível falha no compressor).\nA aula de Inteligência Artificial (19:00) precisa ser remanejada. Sugestão da IA: Sala A-101, livre nesse horário e a 23,4 °C.\nO chamado de manutenção pode ser aberto na página da sala e o remanejamento, na tela Agenda.",
    createdAt: "2026-11-06T18:39:00",
  },
];