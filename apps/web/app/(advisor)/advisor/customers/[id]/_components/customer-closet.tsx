"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { PackageGlyph } from "@/components/ui/glyphs";
import { formatMoney } from "@/components/advisor/customer-vocabulary";
import { useCustomerOrders } from "@/lib/hooks/use-customer-detail";
import { useProduct } from "@/lib/hooks/use-products";
import type { Order, OrderLineItem } from "@/lib/hooks/use-customer-detail";

interface Props {
  customerId: string;
}

interface ClosetEntry {
  lineItemId: string;
  productId: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
  unitPrice: string;
  orderCurrency: string;
  purchasedAt: string;
}

interface ClosetGroup {
  monthKey: string;
  label: string;
  entries: ClosetEntry[];
}

/**
 * Visual purchase history — the BA's "Lo que ha comprado María" view, inspired
 * by Tulip's Closet pattern. Instead of a tabular order list we show every
 * product the client owns as a photo tile, grouped by month. Each tile resolves
 * its own product so the loaded data stays scoped per-row and we don't need a
 * dedicated backend endpoint.
 */
export function CustomerCloset({ customerId }: Props) {
  const { data: orders, isLoading } = useCustomerOrders(customerId);

  const groups = React.useMemo<ClosetGroup[]>(() => {
    if (!orders) return [];
    const entries: ClosetEntry[] = orders.flatMap((order: Order) =>
      (order.items ?? []).map((item: OrderLineItem) => ({
        lineItemId: item.id,
        productId: item.productId,
        title: item.title,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        unitPrice: item.price,
        orderCurrency: order.currency,
        purchasedAt: order.processedAt,
      })),
    );
    return groupByMonth(entries);
  }, [orders]);

  return (
    <SectionCard title="Lo que ha comprado">
      {isLoading ? (
        <ClosetSkeleton />
      ) : groups.length === 0 ? (
        <div className="px-4 py-6">
          <AdvisorEmptyState
            icon={<PackageGlyph className="size-6" />}
            title="Aún sin compras registradas"
            description="Cuando compre algo aquí o por canal online, verás cada producto en su closet."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-7 px-4 pt-2 pb-4">
          {groups.map((group) => (
            <div key={group.monthKey} className="flex flex-col gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {group.label}
              </p>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {group.entries.map((entry) => (
                  <li key={entry.lineItemId}>
                    <ClosetTile entry={entry} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ClosetTile({ entry }: { entry: ClosetEntry }) {
  const { data: product } = useProduct(entry.productId);
  const imageUrl = product?.images?.[0] ?? null;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-200 hover:shadow-sm">
      <div className="relative aspect-[4/5] bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={entry.title}
            fill
            className="object-cover"
            sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 45vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/60">
            <PackageGlyph className="size-7" />
          </div>
        )}
        {entry.quantity > 1 ? (
          <span className="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-background/95 px-1.5 text-[11px] font-medium tabular-nums text-foreground">
            ×{entry.quantity}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {entry.title}
        </p>
        {entry.variantTitle ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {entry.variantTitle}
          </p>
        ) : null}
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {formatMoney(entry.unitPrice, entry.orderCurrency)} ·{" "}
          {format(new Date(entry.purchasedAt), "d MMM", { locale: es })}
        </p>
      </div>
    </article>
  );
}

function ClosetSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-2 pb-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[4/5] animate-pulse rounded-xl border border-border bg-muted/40"
        />
      ))}
    </div>
  );
}

function groupByMonth(entries: ClosetEntry[]): ClosetGroup[] {
  const buckets = new Map<string, ClosetEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.purchasedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, list]) => {
      const sample = new Date(list[0].purchasedAt);
      return {
        monthKey: key,
        label: format(sample, "MMMM yyyy", { locale: es }),
        entries: list.sort(
          (a, b) =>
            new Date(b.purchasedAt).getTime() -
            new Date(a.purchasedAt).getTime(),
        ),
      };
    });
}
