"use client";

import * as React from "react";
import Image from "next/image";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { PackageGlyph } from "@/components/ui/glyphs";
import { useCustomerOrders } from "@/lib/hooks/use-customer-detail";
import type { Order, OrderLineItem } from "@/lib/hooks/use-customer-detail";

interface Props {
  customerId: string;
}

const MAX_ORDERS = 8;

/**
 * Compras anteriores — receipt-style timeline that surfaces *what* the
 * customer bought, not just *how much*. Each order is a card with the
 * shopper context (relative date, store, channel, total) above a horizontal
 * strip of product thumbnails so the BA can recognize a perfume bottle or a
 * lipstick at a glance and pick up the conversation.
 *
 * The strip degrades gracefully when product images are missing (variants
 * without imageUrl fall back to the master product image server-side; if
 * even that's blank we render a placeholder glyph in the same slot so the
 * layout stays stable).
 */
export function PurchaseHistorySection({ customerId }: Props) {
  const { data, isLoading } = useCustomerOrders(customerId);

  if (isLoading) {
    return (
      <SectionCard title="Compras anteriores">
        <PurchaseSkeleton />
      </SectionCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <SectionCard title="Compras anteriores">
        <div className="px-4 py-6">
          <AdvisorEmptyState
            icon={<PackageGlyph className="size-6" />}
            title="Aún sin compras registradas"
            description="Cuando registres una venta o llegue por canal online, la verás aquí."
          />
        </div>
      </SectionCard>
    );
  }

  // Most recent first — the API orders ascending so we reverse here.
  const recent = [...data].reverse().slice(0, MAX_ORDERS);

  return (
    <SectionCard
      title="Compras anteriores"
      action={
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {data.length} {data.length === 1 ? "compra" : "compras"}
        </span>
      }
    >
      <ul className="flex flex-col gap-3 px-2 pt-2 pb-3">
        {recent.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>
    </SectionCard>
  );
}

function OrderCard({ order }: { order: Order }) {
  const items = order.items ?? [];
  const itemCount = items.reduce((n, it) => n + it.quantity, 0);
  const when = new Date(order.processedAt);
  const relative = formatDistanceToNowStrict(when, {
    locale: es,
    addSuffix: true,
  });
  const absolute = format(when, "d MMM yyyy", { locale: es });

  return (
    <li className="rounded-xl border border-border/60 bg-background p-3">
      <header className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="font-heading text-sm text-foreground">
            {itemCount === 1 ? "1 producto" : `${itemCount} productos`}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              · {relative}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {absolute}
            {order.storeName ? ` · ${order.storeName}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            size="sm"
            className="uppercase tracking-wider"
          >
            {humanChannel(order.channel)}
          </Badge>
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatCurrency(order.totalPrice, order.currency)}
          </span>
        </div>
      </header>

      {items.length > 0 ? (
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 pl-1 [scrollbar-width:thin]">
          {items.map((item) => (
            <ProductTile key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ProductTile({ item }: { item: OrderLineItem }) {
  return (
    <li className="flex w-28 shrink-0 flex-col gap-1.5">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40">
        {item.productImageUrl ? (
          <Image
            src={item.productImageUrl}
            alt={item.title}
            fill
            sizes="112px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/40">
            <PackageGlyph className="size-6" />
          </div>
        )}
        {item.quantity > 1 ? (
          <span
            aria-label={`Cantidad ${item.quantity}`}
            className="absolute top-1 right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/85 px-1.5 text-[10px] font-semibold text-background"
          >
            ×{item.quantity}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {item.brand.displayName}
        </p>
        <p
          className="line-clamp-2 text-[11px] leading-tight text-foreground"
          title={item.title}
        >
          {item.title}
        </p>
        {item.variantTitle ? (
          <p className="truncate text-[10px] text-muted-foreground">
            {item.variantTitle}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function PurchaseSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 pt-2 pb-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-background p-3"
        >
          <div className="flex justify-between gap-3 px-1">
            <div className="space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="mt-3 flex gap-3 pl-1">
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="aspect-square w-28 shrink-0 animate-pulse rounded-lg bg-muted/40"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function humanChannel(channel: string): string {
  switch (channel) {
    case "in_store":
      return "Tienda";
    case "online":
      return "Online";
    case "phone":
      return "Teléfono";
    default:
      return channel.replace(/_/g, " ");
  }
}

function formatCurrency(value: string, currency: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}
