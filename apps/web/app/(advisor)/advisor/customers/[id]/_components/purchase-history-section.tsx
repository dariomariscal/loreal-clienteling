"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/advisor/section-card";
import { useCustomerOrders } from "@/lib/hooks/use-customer-detail";

interface Props {
  customerId: string;
}

export function PurchaseHistorySection({ customerId }: Props) {
  const { data, isLoading } = useCustomerOrders(customerId);

  return (
    <SectionCard title="Purchase history">
      {isLoading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No orders yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.slice(0, 8).map((order) => (
            <li
              key={order.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  #{order.orderNumber}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {format(new Date(order.processedAt), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <Badge
                variant="outline"
                size="sm"
                className="uppercase tracking-wider"
              >
                {order.channel}
              </Badge>
              <span className="w-24 text-right font-mono text-sm tabular-nums text-foreground">
                {formatCurrency(order.totalPrice, order.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
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
