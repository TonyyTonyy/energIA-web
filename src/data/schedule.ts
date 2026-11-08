import type { ScheduleEvent, Weekday } from "@/types";

type Slot = [
  roomId: string,
  course: string,
  teacher: string,
  weekdays: Weekday[],
  start: string,
  end: string,
];

const slots: Slot[] = [
  // Manhã
  ["A-201", "Cálculo I", "Prof. Helena Prado", [1, 3], "07:30", "11:30"],
  ["B-102", "Direito Digital", "Prof. Fernando Reis", [2, 4], "07:30", "11:30"],
  ["C-202", "Estatística Aplicada", "Profa. Marta Cunha", [2, 4], "07:30", "11:30"],
  // Tarde
  ["A-201", "Álgebra Linear", "Prof. Helena Prado", [2, 4], "13:30", "17:30"],
  ["A-101", "Engenharia de Software", "Prof. Marcos Lima", [1, 3, 5], "15:00", "19:00"],
  ["A-202", "Redes de Computadores", "Prof. Paulo Viana", [3, 5], "15:00", "19:00"],
  ["B-202", "Administração Geral", "Profa. Luciana Freitas", [1, 3, 5], "15:00", "19:00"],
  ["C-201", "Laboratório de Programação", "Prof. Thiago Borges", [1, 3, 5], "15:00", "19:00"],
  // Noite
  ["A-101", "Banco de Dados", "Profa. Carla Nunes", [2, 4], "19:00", "22:30"],
  ["A-102", "Algoritmos e Estruturas de Dados", "Prof. Renato Alves", [1, 2, 3, 4, 5], "19:00", "22:30"],
  ["B-101", "Gestão de Projetos", "Profa. Beatriz Campos", [1, 2, 3, 4, 5], "19:00", "22:30"],
  ["B-201", "Inteligência Artificial", "Prof. Rafael Teixeira", [1, 3, 5], "19:00", "22:30"],
  ["B-202", "Contabilidade Geral", "Prof. André Siqueira", [2, 4], "19:00", "22:30"],
  ["C-101", "Empreendedorismo", "Prof. Sérgio Moura", [1, 3, 5], "19:30", "22:30"],
  ["C-102", "Segurança da Informação", "Profa. Daniela Costa", [1, 2, 3, 4, 5], "19:00", "22:30"],
  // Sábado
  ["A-101", "Pós: Ciência de Dados", "Prof. Lucas Andrade", [6], "08:00", "12:00"],
  ["C-202", "Estatística Aplicada (reposição)", "Profa. Marta Cunha", [6], "08:00", "12:00"],
  ["A-102", "Atividades de Extensão", "Profa. Juliana Barreto", [6], "13:30", "17:30"],
];

export const scheduleEvents: ScheduleEvent[] = slots.flatMap(
  ([roomId, course, teacher, weekdays, start, end], i) =>
    weekdays.map((weekday) => ({
      id: `ev-${i + 1}-${weekday}`,
      roomId,
      course,
      teacher,
      weekday,
      start,
      end,
    })),
);