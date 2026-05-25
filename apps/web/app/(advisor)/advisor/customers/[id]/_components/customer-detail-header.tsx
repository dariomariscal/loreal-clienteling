"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import {
  EmailDotGlyph,
  MessageGlyph,
  WhatsappDotGlyph,
} from "@/components/ui/glyphs";
import type { Customer } from "@/lib/hooks/use-customers";

interface Props {
  customer: Customer;
}

export function CustomerDetailHeader({ customer }: Props) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const ltv = formatCurrency(customer.totalSpent);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-10 py-6 backdrop-blur lg:px-14">
      <div className="mx-auto flex w-full max-w-3xl items-start gap-5">
        <CustomerAvatar
          firstName={customer.firstName}
          lastName={customer.lastName}
          avatarUrl={customer.avatarUrl}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-heading)] text-2xl tracking-tight text-foreground">
              {fullName}
            </h1>
            {customer.loyaltyTier ? (
              <Badge variant="outline" className="uppercase tracking-wider">
                {customer.loyaltyTier}
              </Badge>
            ) : null}
            {customer.lifecycleStage === "vip" ? (
              <Badge className="uppercase tracking-wider">VIP</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ltv} LTV · {customer.ordersCount} orders
            {customer.preferredChannel
              ? ` · prefers ${customer.preferredChannel}`
              : ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              <MessageGlyph className="size-4" />
              Message
            </Button>
            {customer.acceptsMarketingWhatsapp && customer.phone ? (
              <Button size="sm" variant="outline">
                <WhatsappDotGlyph className="size-4" />
                WhatsApp
              </Button>
            ) : null}
            {customer.email ? (
              <Button size="sm" variant="outline">
                <EmailDotGlyph className="size-4" />
                Email
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function formatCurrency(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}
