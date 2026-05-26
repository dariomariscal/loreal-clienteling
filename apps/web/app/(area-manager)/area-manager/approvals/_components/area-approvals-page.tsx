"use client";

import { useState } from "react";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { useApprovalRequests } from "@/lib/hooks/use-approval-requests";
import { ApprovalList } from "@/app/(advisor)/advisor/counter/_components/approval-list";
import { ApprovalDetail } from "@/app/(advisor)/advisor/counter/_components/approval-detail";

/**
 * Approval queue for the area manager. Same list+detail UX the Counter
 * Manager uses — Linear / Gmail / GitHub all converged on this pattern for
 * approval flows. The API already scopes the rows to the caller's
 * accessible stores, so we just need to render the list.
 */
export function AreaApprovalsPage() {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: approvals, isLoading } = useApprovalRequests(
    filter === "pending" ? { status: "pending" } : {},
  );

  const visible = approvals ?? [];
  const selected = visible.find((a) => a.id === selectedId) ?? null;

  if (!selectedId && visible.length > 0) {
    setSelectedId(visible[0].id);
  }

  return (
    <ThreeColumnLayout
      list={
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-[family-name:var(--font-heading)] text-base font-medium tracking-tight">
              Aprobaciones · Zona
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Todas las tiendas en tu scope
            </p>
            <div className="mt-3 flex gap-1.5">
              <FilterPill
                active={filter === "pending"}
                onClick={() => setFilter("pending")}
                label="Pendientes"
              />
              <FilterPill
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="Todas"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ApprovalList
              approvals={visible}
              selectedId={selectedId}
              onSelect={setSelectedId}
              loading={isLoading}
            />
          </div>
        </div>
      }
      detail={
        <ApprovalDetail
          approval={selected}
          onResolved={() => {
            const idx = visible.findIndex((a) => a.id === selectedId);
            const next = visible[idx + 1] ?? visible[idx - 1] ?? null;
            setSelectedId(next?.id ?? null);
          }}
        />
      }
    />
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
          : "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40"
      }
    >
      {label}
    </button>
  );
}
