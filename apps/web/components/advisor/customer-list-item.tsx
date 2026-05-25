"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney, lifecycleMeta } from "@/components/advisor/customer-vocabulary";
import type { CustomerListItem as CustomerListItemType } from "@/lib/hooks/use-customers";

interface Props {
  customer: CustomerListItemType;
  hrefBase?: string;
  active?: boolean;
}

export function CustomerListItem({
  customer,
  hrefBase = "/advisor/customers",
  active = false,
}: Props) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const hook = buildHook(customer);
  const lifecycle = lifecycleMeta(customer.lifecycleStage);
  const isVip = customer.lifecycleStage === "vip";

  return (
    <Link
      href={`${hrefBase}/${customer.id}`}
      className={cn(
        "flex items-center gap-3 border-l-2 px-4 py-3 transition-colors",
        active
          ? "border-l-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)]"
          : "border-l-transparent hover:bg-muted/60",
      )}
      aria-current={active ? "page" : undefined}
    >
      <CustomerAvatar
        firstName={customer.firstName}
        lastName={customer.lastName}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {fullName}
          </p>
          {isVip ? (
            <Badge variant="outline" size="sm" className="uppercase tracking-wider">
              VIP
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {lifecycle.label}
          {customer.lastInteractionAt
            ? ` · hace ${formatDistanceToNowStrict(new Date(customer.lastInteractionAt), { locale: es, addSuffix: false })}`
            : ""}
        </p>
        {hook ? (
          <p className="mt-1 truncate text-xs text-muted-foreground/80">
            {hook}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function buildHook(c: CustomerListItemType): string | null {
  if (c.orderCount && c.orderCount > 0 && c.ltv) {
    return `${c.orderCount} compras · ${formatMoney(c.ltv)}`;
  }
  if (c.email) return c.email;
  if (c.phone) return c.phone;
  return null;
}
