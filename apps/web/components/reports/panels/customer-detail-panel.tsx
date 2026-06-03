"use client";

import * as React from "react";
import Link from "next/link";
import {
  ReportSidePanel,
  useReportSidePanel,
} from "@/components/reports/report-side-panel";
import { Badge } from "@/components/ui/badge";
import { useCustomer } from "@/lib/hooks/use-customers";

/**
 * Customer drill-down panel — opens whenever `?customerId=xxx` is in the URL.
 * Reusable across every report that lists customers (counter, area, national).
 * Reads its open state from the URL via `useReportSidePanel("customerId")`.
 */
export function CustomerDetailPanel() {
  const { openId } = useReportSidePanel("customerId");
  if (!openId) return null;
  return <CustomerDetailPanelBody customerId={openId} />;
}

function CustomerDetailPanelBody({ customerId }: { customerId: string }) {
  const { data: customer, isLoading } = useCustomer(customerId);

  const title = isLoading
    ? "Cargando…"
    : customer
      ? `${customer.firstName} ${customer.lastName}`
      : "Cliente";

  const description = customer
    ? [customer.email, customer.phone].filter(Boolean).join(" · ")
    : undefined;

  return (
    <ReportSidePanel
      paramName="customerId"
      title={title}
      description={description}
      footer={
        customer ? (
          <Link
            href={`/advisor/customers/${customer.id}`}
            className="inline-flex h-9 items-center rounded-md bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/90"
          >
            Ver perfil completo →
          </Link>
        ) : null
      }
    >
      {customer ? (
        <CustomerPanelContent customer={customer} />
      ) : isLoading ? (
        <SkeletonContent />
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No se encontró el cliente.
        </p>
      )}
    </ReportSidePanel>
  );
}

function CustomerPanelContent({
  customer,
}: {
  customer: NonNullable<ReturnType<typeof useCustomer>["data"]>;
}) {
  return (
    <div className="flex flex-col gap-6 py-6">
      <header className="flex flex-wrap items-center gap-2">
        {customer.lifecycleStage ? (
          <Badge variant="secondary">{customer.lifecycleStage}</Badge>
        ) : null}
        {customer.loyaltyTier ? (
          <Badge variant="outline">{customer.loyaltyTier}</Badge>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Gasto total" value={formatMoney(customer.totalSpent)} />
        <Stat label="Pedidos" value={String(customer.ordersCount)} />
        <Stat
          label="Cliente desde"
          value={formatDate(customer.enrolledAt) ?? "—"}
        />
        <Stat
          label="Última transacción"
          value={formatDate(customer.lastOrderAt) ?? "—"}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Contacto
        </h3>
        <dl className="space-y-1.5 text-sm">
          <Field label="Cumpleaños" value={formatDate(customer.birthday) ?? "—"} />
          <Field
            label="Canal preferido"
            value={customer.preferredChannel ?? "—"}
          />
          <Field
            label="Último contacto"
            value={formatDate(customer.lastInteractionAt) ?? "—"}
          />
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function SkeletonContent() {
  return (
    <div className="flex flex-col gap-3 py-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function formatMoney(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
