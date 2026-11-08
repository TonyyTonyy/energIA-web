import type { AIDecision } from "@/types";

// Mais recentes primeiro.
export const aiDecisions: AIDecision[] = [
  {
    id: "dec-014", timestamp: "2026-11-06T18:36:00", roomId: "B-102",
    action: "lights_off", trigger: "sensor",
    reason: "Nenhuma presença detectada há 10 minutos e não há aula agendada para hoje; luzes apagadas.",
    confidence: 0.97, estimatedSavingKwh: 0.3,
  },
  {
    id: "dec-013", timestamp: "2026-11-06T18:30:00", roomId: "B-201",
    action: "keep_off", trigger: "sensor",
    reason: "O ar-condicionado não responde aos comandos (possível falha no compressor). Chamado aberto e sugerido remanejar a turma das 19:00 para outra sala.",
    confidence: 0.92, estimatedSavingKwh: 0,
  },
  {
    id: "dec-012", timestamp: "2026-11-06T18:25:00", roomId: "A-102",
    action: "ac_on", trigger: "schedule",
    reason: "Aula às 19:00 e sala a 28,1 °C. Ar ligado 35 minutos antes para atingir 23 °C no início da aula.",
    confidence: 0.95, estimatedSavingKwh: 0,
  },
  {
    id: "dec-011", timestamp: "2026-11-06T18:20:00", roomId: "B-101",
    action: "ac_on", trigger: "schedule",
    reason: "Aula às 19:00 e sala a 27,9 °C. Ar ligado 40 minutos antes (sala maior, resfria mais devagar).",
    confidence: 0.94, estimatedSavingKwh: 0,
  },
  {
    id: "dec-010", timestamp: "2026-11-06T18:15:00", roomId: "C-102",
    action: "ac_on", trigger: "schedule",
    reason: "Aula às 19:00 e sala a 27,2 °C. Ar ligado 45 minutos antes para chegar a 23 °C a tempo.",
    confidence: 0.93, estimatedSavingKwh: 0,
  },
  {
    id: "dec-009", timestamp: "2026-11-06T18:10:00", roomId: "C-101",
    action: "keep_off", trigger: "energy_calc",
    reason: "Próxima aula só às 19:30. Manter desligado e religar às 18:55 consome 2,1 kWh a menos do que manter o ar ligado.",
    confidence: 0.89, estimatedSavingKwh: 2.1,
  },
  {
    id: "dec-008", timestamp: "2026-11-06T17:55:00", roomId: "A-201",
    action: "ac_off", trigger: "pattern",
    reason: "Padrão aprendido: às sextas esta sala fica vazia depois das 17:00. Ar-condicionado desligado.",
    confidence: 0.88, estimatedSavingKwh: 2.4,
  },
  {
    id: "dec-007", timestamp: "2026-11-06T17:52:00", roomId: "A-201",
    action: "lights_off", trigger: "sensor",
    reason: "Sala vazia há 8 minutos segundo o sensor de presença; luzes apagadas.",
    confidence: 0.98, estimatedSavingKwh: 0.5,
  },
  {
    id: "dec-006", timestamp: "2026-11-06T17:32:00", roomId: "C-202",
    action: "ac_off", trigger: "energy_calc",
    reason: "Sem aulas pelo resto do dia. Desligar agora evita horas de consumo desnecessário.",
    confidence: 0.96, estimatedSavingKwh: 5.4,
  },
  {
    id: "dec-005", timestamp: "2026-11-06T17:10:00", roomId: "A-102",
    action: "ac_off", trigger: "sensor",
    reason: "Sala vazia há 15 minutos e próxima aula só às 19:00. Ar desligado até o pré-resfriamento.",
    confidence: 0.93, estimatedSavingKwh: 1.8,
  },
  {
    id: "dec-004", timestamp: "2026-11-06T14:25:00", roomId: "C-201",
    action: "ac_on", trigger: "schedule",
    reason: "Aula de laboratório às 15:00. Ar ligado 35 minutos antes para o início da aula já confortável.",
    confidence: 0.94, estimatedSavingKwh: 0,
  },
  {
    id: "dec-003", timestamp: "2026-11-06T14:20:00", roomId: "A-101",
    action: "ac_on", trigger: "schedule",
    reason: "Aula às 15:00 e sala a 26,2 °C. Ar religado 40 minutos antes do início.",
    confidence: 0.95, estimatedSavingKwh: 0,
  },
  {
    id: "dec-002", timestamp: "2026-11-06T12:05:00", roomId: "A-101",
    action: "ac_off", trigger: "energy_calc",
    reason: "Próxima aula às 15:00 (3 h de intervalo). Desligar agora e religar às 14:20 consome 4,8 kWh a menos do que manter ligado.",
    confidence: 0.91, estimatedSavingKwh: 4.8,
  },
  {
    id: "dec-001", timestamp: "2026-11-06T11:35:00", roomId: "C-102",
    action: "lights_off", trigger: "sensor",
    reason: "Nenhuma presença detectada e sem aula agendada até a noite; luzes apagadas.",
    confidence: 0.97, estimatedSavingKwh: 0.4,
  },
];