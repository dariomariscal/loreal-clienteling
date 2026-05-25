"use client";

import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import {
  channelLabel,
  lifecycleMeta,
} from "@/components/advisor/customer-vocabulary";
import type { Customer } from "@/lib/hooks/use-customers";

interface Props {
  customer: Customer;
}

/**
 * Sticky hero header for the customer detail surface. iPad-first:
 *   - generous padding (px-10 lg:px-14, py-7) — luxury "respiration".
 *   - everything in Beauty-Advisor voice: "Clienta desde …", "Le gusta que
 *     la contactes por WhatsApp", never "lifecycle stage".
 * Quick-action buttons live in `CustomerQuickActions` below this header, not
 * here — keeps responsibilities single (SRP).
 */
export function CustomerDetailHeader({ customer }: Props) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const lifecycle = lifecycleMeta(customer.lifecycleStage);
  const since = format(new Date(customer.enrolledAt), "MMM yyyy", { locale: es });
  const lastVisit = pickLastVisit(customer.lastInteractionAt, customer.lastOrderAt);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-10 py-7 backdrop-blur lg:px-14">
      <div className="mx-auto flex w-full max-w-4xl items-start gap-6">
        <CustomerAvatar
          firstName={customer.firstName}
          lastName={customer.lastName}
          avatarUrl={customer.avatarUrl}
          size="xl"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
              {fullName}
            </h1>
            <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
            {customer.loyaltyTier ? (
              <Badge variant="outline" className="uppercase tracking-wider">
                {customer.loyaltyTier}
              </Badge>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Clienta desde {since}
            {lastVisit ? <> · Última visita {lastVisit}</> : null}
          </p>

          {customer.preferredChannel ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Le gusta que la contactes por{" "}
              <span className="text-foreground">
                {channelLabel(customer.preferredChannel)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function pickLastVisit(
  interactionAt: string | null,
  orderAt: string | null,
): string | null {
  const candidates = [interactionAt, orderAt]
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d));
  if (candidates.length === 0) return null;
  const latest = new Date(Math.max(...candidates.map((d) => d.getTime())));
  return formatDistanceToNow(latest, { addSuffix: true, locale: es });
}
