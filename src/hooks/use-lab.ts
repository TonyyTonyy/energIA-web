"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { LabEngine, type LabSnapshot } from "@/lib/ml/engine";

export type LabSpeed = 1 | 4 | 16;

export function useLab() {
  const [engine, setEngine] = useState(() => new LabEngine());
  const [snap, setSnap] = useState<LabSnapshot>(() => engine.snapshot());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<LabSpeed>(4);
  const phase = snap.phase;

  useEffect(() => {
    if (!running || phase !== "ready") return;
    const id = setInterval(() => {
      engine.step(speed);
      setSnap(engine.snapshot());
    }, 250);
    return () => clearInterval(id);
  }, [engine, running, speed, phase]);

  const train = useCallback(async () => {
    if (engine.phase !== "idle") return;
    await engine.pretrain(() => setSnap(engine.snapshot()));
    setSnap(engine.snapshot());
    toast.success("Modelo treinado", { description: "Pronto para rodar em tempo real." });
  }, [engine]);

  const reset = useCallback(() => {
    const next = new LabEngine();
    setRunning(false);
    setEngine(next);
    setSnap(next.snapshot());
  }, []);

  const toggleHeat = () => {
    const on = engine.toggleHeat();
    toast.info(on ? "Onda de calor: +5 °C lá fora" : "Temperatura externa normalizada");
    setSnap(engine.snapshot());
  };

  const cancelNext = () => {
    const desc = engine.cancelNextClass();
    if (desc) {
      toast.warning("Aula cancelada sem aviso", {
        description: `${desc}. A IA não sabe disso: precisa perceber pelos sensores.`,
      });
    } else {
      toast.error("Nenhuma aula próxima para cancelar");
    }
    setSnap(engine.snapshot());
  };

  const toggleBreak = () => {
    const broken = engine.toggleB201();
    toast.info(broken ? "O ar da B-201 quebrou" : "O ar da B-201 foi consertado");
    setSnap(engine.snapshot());
  };

  return {
    snap,
    running,
    speed,
    setSpeed,
    toggleRun: () => setRunning((r) => !r),
    train,
    reset,
    toggleHeat,
    cancelNext,
    toggleBreak,
  };
}