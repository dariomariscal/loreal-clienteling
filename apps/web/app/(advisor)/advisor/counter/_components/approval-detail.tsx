"use client";

import { useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
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
          <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
            <PayloadView
              type={approval.type}
              payload={approval.payload}
              createdAt={approval.createdAt}
            />
          </div>
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

type Payload = Record<string, unknown>;

function PayloadView({
  type,
  payload,
  createdAt,
}: {
  type: ApprovalRequest["type"];
  payload: Payload | null | undefined;
  createdAt: string;
}) {
  const p = (payload ?? {}) as Payload;
  switch (type) {
    case "reservation_long":
      return <ReservationLongView payload={p} createdAt={createdAt} />;
    case "discount_special":
      return <DiscountSpecialView payload={p} />;
    case "return":
      return <ReturnView payload={p} />;
    case "vip_profile_change":
      return <VipProfileChangeView payload={p} />;
    default:
      return <FieldList rows={objectToRows(p)} />;
  }
}

function ReservationLongView({
  payload,
  createdAt,
}: {
  payload: Payload;
  createdAt: string;
}) {
  const holdUntilRaw = asString(payload.holdUntil);
  const holdUntil = holdUntilRaw ? new Date(holdUntilRaw) : null;
  const quantity = asNumber(payload.quantity);
  const reason = asString(payload.reason);
  const days = holdUntil
    ? Math.max(0, differenceInCalendarDays(holdUntil, new Date(createdAt)))
    : null;

  return (
    <FieldList
      rows={[
        quantity != null
          ? {
              label: "Cantidad reservada",
              value: `${quantity} ${quantity === 1 ? "unidad" : "unidades"}`,
            }
          : null,
        holdUntil
          ? {
              label: "Retención hasta",
              value: format(holdUntil, "EEEE d 'de' MMMM yyyy", { locale: es }),
              hint: days != null ? `${days} ${days === 1 ? "día" : "días"} desde la solicitud` : undefined,
            }
          : null,
        reason ? { label: "Motivo de la clienta", value: reason } : null,
      ]}
    />
  );
}

function DiscountSpecialView({ payload }: { payload: Payload }) {
  const pct = asNumber(payload.discountPct);
  const reason = asString(payload.reason);
  return (
    <FieldList
      rows={[
        pct != null
          ? { label: "Descuento solicitado", value: `${pct}%` }
          : null,
        reason ? { label: "Motivo", value: reason } : null,
      ]}
    />
  );
}

function ReturnView({ payload }: { payload: Payload }) {
  const items = Array.isArray(payload.items) ? (payload.items as Payload[]) : [];
  const totalUnits = items.reduce(
    (sum, item) => sum + (asNumber(item.quantity) ?? 0),
    0,
  );
  const reason = asString(payload.reason);
  return (
    <FieldList
      rows={[
        items.length > 0
          ? {
              label: "Artículos a devolver",
              value: `${items.length} ${items.length === 1 ? "línea" : "líneas"}`,
              hint: totalUnits > 0 ? `${totalUnits} unidades en total` : undefined,
            }
          : null,
        reason ? { label: "Motivo de la devolución", value: reason } : null,
      ]}
    />
  );
}

function VipProfileChangeView({ payload }: { payload: Payload }) {
  const changes = (payload.changes ?? {}) as Payload;
  const rows = Object.entries(changes).map(([field, value]) => {
    const change = (value ?? {}) as Payload;
    const from = formatPrimitive(change.from);
    const to = formatPrimitive(change.to);
    return {
      label: VIP_FIELD_LABEL[field] ?? field,
      value: `${from} → ${to}`,
    };
  });
  return <FieldList rows={rows.length > 0 ? rows : objectToRows(payload)} />;
}

const VIP_FIELD_LABEL: Record<string, string> = {
  vipTier: "Nivel VIP",
  vipThreshold: "Umbral VIP",
};

type Row = { label: string; value: string; hint?: string } | null;

function FieldList({ rows }: { rows: Row[] }) {
  const visible = rows.filter((r): r is NonNullable<Row> => r !== null);
  if (visible.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        Sin datos adicionales.
      </p>
    );
  }
  return (
    <dl className="divide-y divide-border">
      {visible.map((row, i) => (
        <div key={i} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {row.label}
          </dt>
          <dd className="text-sm text-foreground">
            <p>{row.value}</p>
            {row.hint ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{row.hint}</p>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function objectToRows(obj: Payload): Row[] {
  return Object.entries(obj).map(([k, v]) => ({
    label: k,
    value: formatPrimitive(v),
  }));
}

function formatPrimitive(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  return JSON.stringify(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
