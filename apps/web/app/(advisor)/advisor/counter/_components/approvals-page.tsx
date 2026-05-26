"use client";

import { useState } from "react";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { useApprovalRequests } from "@/lib/hooks/use-approval-requests";
import { ApprovalList } from "./approval-list";
import { ApprovalDetail } from "./approval-detail";

export function CounterApprovalsPage() {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: approvals, isLoading } = useApprovalRequests(
    filter === "pending" ? { status: "pending" } : {},
  );

  const visible = approvals ?? [];
  const selected = visible.find((a) => a.id === selectedId) ?? null;

  // Auto-pick first row when the list arrives.
  if (!selectedId && visible.length > 0) {
    setSelectedId(visible[0].id);
  }

  return (
    <ThreeColumnLayout
      list={
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-[var(--font-heading)] text-base font-medium tracking-tight">
              Aprobaciones
            </h2>
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
            // Move to the next pending item if there is one, otherwise clear.
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
