import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}

export function StatCard({ title, value, hint, icon: Icon, tone = "default", className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
          <Icon className="size-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}