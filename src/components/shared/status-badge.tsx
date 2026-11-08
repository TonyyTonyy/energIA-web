import { Badge } from "@/components/ui/badge";
import { ROOM_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { RoomStatus } from "@/types";

const STATUS_STYLES: Record<RoomStatus, string> = {
  occupied: "border-success/30 bg-success/10 text-success",
  empty: "border-border bg-muted text-muted-foreground",
  scheduled: "border-info/30 bg-info/10 text-info",
  issue: "border-danger/30 bg-danger/10 text-danger",
};

interface StatusBadgeProps {
  status: RoomStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {ROOM_STATUS_LABEL[status]}
    </Badge>
  );
}