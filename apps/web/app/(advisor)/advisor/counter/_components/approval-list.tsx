"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { CheckCircleGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import type {
  ApprovalRequestRow,
  ApprovalType,
} from "@/lib/hooks/use-approval-requests";

export const APPROVAL_TYPE_LABEL: Record<ApprovalType, string> = {
  reservation_long: "Reserva larga",
  discount_special: "Descuento especial",
  return: "Devolución",
  vip_profile_change: "Cambio VIP",
};

const APPROVAL_TYPE_TONE: Record<ApprovalType, string> = {
  reservation_long: "bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]",
  discount_special:
    "bg-[var(--color-warning,oklch(0.75_0.15_65))]/10 text-[var(--color-warning,oklch(0.75_0.15_65))]",
  return: "bg-destructive/10 text-destructive",
  vip_profile_change: "bg-muted text-foreground",
};

interface ApprovalListProps {
  approvals: ApprovalRequestRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function ApprovalList({
  approvals,
  selectedId,
  onSelect,
  loading,
}: ApprovalListProps) {
  if (loading) {
    return (
      <ul className="divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <li key={i} className="space-y-2 px-4 py-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }

  if (approvals.length === 0) {
    return (
      <AdvisorEmptyState
        icon={<CheckCircleGlyph className="size-6" />}
        title="Sin aprobaciones pendientes"
        description="Cuando una BA pida tu autorización, aparecerá aquí."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {approvals.map((a) => {
        const active = a.id === selectedId;
        const ago = formatDistanceToNow(new Date(a.createdAt), {
          addSuffix: true,
          locale: es,
        });
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                active
                  ? "bg-[color:var(--ba-accent-soft)]"
                  : "hover:bg-muted/40",
              )}
            >
              <CustomerAvatar
                firstName={a.requestedByName ?? "BA"}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-0 text-[10px] uppercase tracking-wider",
                      APPROVAL_TYPE_TONE[a.type],
                    )}
                  >
                    {APPROVAL_TYPE_LABEL[a.type]}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {a.requestedByName ?? "BA"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{ago}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
