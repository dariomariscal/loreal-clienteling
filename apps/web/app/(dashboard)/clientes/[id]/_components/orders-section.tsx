"use client";

import * as React from "react";
import { useCustomerOrders, type Order, type OrderLineItem } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TimelineIllustration } from "@/components/ui/illustrations";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  pos_integration: "POS",
  manual: "Manual",
  ecommerce: "E-commerce",
};

const SOURCE_VARIANT: Record<string, "default" | "info" | "secondary"> = {
  pos_integration: "info",
  manual: "secondary",
  ecommerce: "secondary",
};

interface OrdersSectionProps {
  customerId: string;
  onNewOrder?: () => void;
}

export function OrdersSection({
  customerId,
  onNewOrder,
}: OrdersSectionProps) {
  const { data: orders = [], isLoading } = useCustomerOrders(customerId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        illustration={<TimelineIllustration />}
        title="Sin compras registradas"
        description="Cuando la clienta haga una compra, aparecerá aquí con el detalle de productos y montos."
        action={
          onNewOrder ? (
            <Button onClick={onNewOrder}>Registrar compra</Button>
          ) : undefined
        }
      />
    );
  }

  // Aggregate totals at the top — a small "year-to-date" feel that mirrors
  // the editorial style. Cheap to compute client-side for one customer.
  const total = orders.reduce(
    (sum: number, p: Order) => sum + Number(p.totalPrice),
    0,
  );
  const itemTotal = orders.reduce(
    (sum: number, p: Order) =>
      sum +
      (p.items?.reduce(
        (s: number, i: OrderLineItem) => s + (i.quantity ?? 0),
        0,
      ) ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border/40 bg-muted/20 px-5 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Histórico
          </p>
          <p className="font-heading text-2xl tabular-nums text-foreground">
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-6 text-right text-xs text-muted-foreground">
          <div>
            <p className="text-[11px] uppercase tracking-wider">Compras</p>
            <p className="font-heading text-base text-foreground tabular-nums">
              {orders.length}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider">Productos</p>
            <p className="font-heading text-base text-foreground tabular-nums">
              {itemTotal}
            </p>
          </div>
        </div>
        {onNewOrder && (
          <Button size="sm" onClick={onNewOrder}>
            Nueva compra
          </Button>
        )}
      </div>

      {/* Receipt list */}
      <ul className="space-y-2.5">
        {orders
          .slice()
          .sort(
            (a: Order, b: Order) =>
              new Date(b.processedAt).getTime() -
              new Date(a.processedAt).getTime(),
          )
          .map((p: Order) => (
            <OrderReceipt key={p.id} order={p} />
          ))}
      </ul>
    </div>
  );
}

function OrderReceipt({ order }: { order: Order }) {
  const date = new Date(order.processedAt);
  const itemCount =
    order.items?.reduce(
      (s: number, i: OrderLineItem) => s + (i.quantity ?? 0),
      0,
    ) ?? 0;

  return (
    <li
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4",
        "transition-shadow duration-200 hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="font-heading text-[15px] text-foreground">
            {date.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {date.toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            ·{" "}
            {itemCount === 0
              ? "Sin productos"
              : itemCount === 1
                ? "1 producto"
                : `${itemCount} productos`}
            {order.externalOrderId
              ? ` · Folio ${order.externalOrderId}`
              : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-heading text-lg tabular-nums text-foreground">
            $
            {Number(order.totalPrice).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}
          </span>
          <Badge
            variant={SOURCE_VARIANT[order.sourceName] ?? "secondary"}
            size="sm"
          >
            {SOURCE_LABEL[order.sourceName] ?? order.sourceName}
          </Badge>
        </div>
      </div>

      {/* Item rows — compact list, no table chrome */}
      {order.items && order.items.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border/30 pt-3 text-[12px]">
          {order.items.map((it: OrderLineItem) => (
            <li
              key={it.id}
              className="flex items-baseline justify-between gap-3 text-muted-foreground"
            >
              <span className="truncate">
                <span className="tabular-nums text-foreground">
                  {it.quantity}×
                </span>{" "}
                <span className="text-foreground">{it.sku}</span>
              </span>
              <span className="tabular-nums">
                $
                {(
                  Number(it.unitPrice) * (it.quantity ?? 1)
                ).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
