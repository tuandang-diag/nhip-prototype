import { AlertCircle, CheckCircle2, Circle, Eye } from "lucide-react";
import type { MemberStatus } from "../types";
import { statusLabels } from "../utils";

const icons = {
  unopened: Circle,
  acknowledged: Eye,
  completed: CheckCircle2,
  blocked: AlertCircle
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  const Icon = icons[status];
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={14} aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
