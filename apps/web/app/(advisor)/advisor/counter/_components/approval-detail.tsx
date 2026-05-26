"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { CheckCircleGlyph, CloseGlyph } from "@/components/ui/glyphs";
import { useDecideApprovalRequest } from "@/lib/hooks/use-approval-requests";
import type { ApprovalRequest } from "@/lib/hooks/use-approval-requests";
import { APPROVAL_TYPE_LABEL } from "./approval-list";

interface ApprovalDetailProps {
  approval: ApprovalRequest | null;
  /** Called after a successful decision so the parent can move to the next item. */
  onResolved?: () => void;
}

export function ApprovalDetail({ approval, onResolved }: ApprovalDetailProps) {
  const [notes, setNotes] = useState("");
  const decide = useDecideApprovalRequest();

  if (!approval) {
    return (
      <div className="grid h-full place-items-center px-6">
        <AdvisorEmptyState
          icon={<CheckCircleGlyph className="size-6" />}
          title="Elige una solicitud"
          description="Selecciona una aprobación de la lista para ver el detalle."
        />
      </div>
    );
  }

  const isPending = approval.status === "pending";

  function handle(decision: "approve" | "reject") {
    if (!approval) return;
    decide.mutate(
      { id: approval.id, decision, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success(
            decision === "approve" ? "Aprobada" : "Rechazada",
          );
          setNotes("");
          onResolved?.();
        },
        onError: () =>
          toast.error("No se pudo registrar la decisión. Intenta de nuevo."),
      },
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline" className="uppercase tracking-wider">
            {APPROVAL_TYPE_LABEL[approval.type]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(approval.createdAt), "d MMM yyyy · HH:mm", { locale: es })}
          </span>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-heading)] text-xl font-medium text-foreground">
          Solicitud de {approval.requestedByUserId ? "una BA" : "el equipo"}
        </h2>
        {approval.reason ? (
          <p className="mt-2 text-sm text-muted-foreground">{approval.reason}</p>
        ) : null}
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Detalle
          </h3>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
            {JSON.stringify(approval.payload, null, 2)}
          </pre>
        </section>

        {!isPending ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estado
            </h3>
            <p className="mt-2 text-sm text-foreground">
              <Badge
                className="uppercase tracking-wider"
                variant={approval.status === "approved" ? "default" : "outline"}
              >
                {approval.status === "approved"
                  ? "Aprobada"
                  : approval.status === "rejected"
                    ? "Rechazada"
                    : "Cancelada"}
              </Badge>
              {approval.decidedAt ? (
                <span className="ml-3 text-muted-foreground">
                  el{" "}
                  {format(new Date(approval.decidedAt), "d MMM HH:mm", {
                    locale: es,
                  })}
                </span>
              ) : null}
            </p>
            {approval.decisionNotes ? (
              <p className="mt-2 text-sm text-foreground">
                <span className="font-medium">Nota:</span> {approval.decisionNotes}
              </p>
            ) : null}
          </section>
        ) : (
          <section>
            <label
              htmlFor="approval-notes"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Nota interna (opcional)
            </label>
            <textarea
              id="approval-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Ej: OK con base en LTV últimos 90 días."
              className="mt-2 min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
            />
          </section>
        )}
      </div>

      {isPending ? (
        <footer className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handle("reject")}
            disabled={decide.isPending}
            className="min-h-12 gap-2"
          >
            <CloseGlyph className="size-4" />
            Rechazar
          </Button>
          <Button
            size="lg"
            onClick={() => handle("approve")}
            disabled={decide.isPending}
            className="min-h-12 gap-2"
          >
            <CheckCircleGlyph className="size-4" />
            {decide.isPending ? "Guardando…" : "Aprobar"}
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
