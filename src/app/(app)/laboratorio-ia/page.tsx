"use client";

import { FlaskConical } from "lucide-react";

import { LabComparison } from "@/components/lab/lab-comparison";
import { LabControls, LabTrainCard } from "@/components/lab/lab-controls";
import { LabDecisionFeed } from "@/components/lab/lab-decision-feed";
import { LabLiveRooms } from "@/components/lab/lab-live-rooms";
import { LabMlPanel } from "@/components/lab/lab-ml-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { useLab } from "@/hooks/use-lab";

export default function Page() {
  const lab = useLab();
  const { snap } = lab;
  const ready = snap.phase === "ready";
  const busy = snap.phase === "simulating" || snap.phase === "training";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laboratório de IA"
        description="Modelos de aprendizado de máquina treinados e decidindo em tempo real sobre salas e equipamentos simulados, comparados com o funcionamento manual e com uma regra fixa."
        actions={
          <Badge variant="outline" className="gap-1.5 py-1">
            <FlaskConical className="size-3.5" aria-hidden />
            ML real · ambiente simulado
          </Badge>
        }
      />

      {!ready && <LabTrainCard snap={snap} onTrain={lab.train} />}

      {ready && (
        <>
          <LabControls
            snap={snap}
            running={lab.running}
            speed={lab.speed}
            onSpeed={lab.setSpeed}
            onToggleRun={lab.toggleRun}
            onHeat={lab.toggleHeat}
            onCancel={lab.cancelNext}
            onBreak={lab.toggleBreak}
            onReset={lab.reset}
          />
          <LabComparison snap={snap} />
          <div className="grid gap-6 xl:grid-cols-3">
            <LabLiveRooms rooms={snap.rooms} className="xl:col-span-2" />
            <LabDecisionFeed decisions={snap.decisions} />
          </div>
        </>
      )}

      {snap.epochs.length > 0 && !busy && <LabMlPanel snap={snap} />}
    </div>
  );
}