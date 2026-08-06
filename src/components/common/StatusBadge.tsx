import { Badge, type BadgeProps } from "@/components/ui/badge";

const VARIANTS: Record<string, BadgeProps["variant"]> = {
  draft: "muted",
  active: "success",
  open: "success",
  closed: "destructive",
  scheduled: "warning",
  expired: "warning",
  archived: "muted",
  passed: "success",
  failed: "destructive",
  completed: "success",
  in_progress: "warning",
  not_started: "muted",
  disqualified: "destructive",
  pending_review: "warning",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "secondary"} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
