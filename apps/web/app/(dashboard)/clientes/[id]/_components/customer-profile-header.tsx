"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { BackGlyph, MoreGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/hooks";

const SEGMENT_LABEL: Record<string, string> = {
  new: "Nueva",
  returning: "Recurrente",
  vip: "VIP",
  at_risk: "En riesgo",
};

const SEGMENT_VARIANT: Record<
  string,
  "default" | "info" | "success" | "warning"
> = {
  new: "info",
  returning: "default",
  vip: "success",
  at_risk: "warning",
};

interface CustomerProfileHeaderProps {
  customer: Customer;
  /** Renders the "..." actions trigger when provided. */
  onOpenActions?: () => void;
}

/**
 * Profile header — always rendered above the KPI cards. The header is the
 * BA's anchor: name, segment, contact, "client since / last visit". It must
 * stay legible at 768px (iPad portrait) without horizontal scroll.
 */
export function CustomerProfileHeader({
  customer,
  onOpenActions,
}: CustomerProfileHeaderProps) {
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const segmentVariant = SEGMENT_VARIANT[customer.lifecycleStage] ?? "default";
  const segmentLabel =
    SEGMENT_LABEL[customer.lifecycleStage] ?? customer.lifecycleStage;

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href="/clientes"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 text-muted-foreground",
          )}
        >
          <BackGlyph className="size-4" />
          Volver
        </Link>
        {onOpenActions ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenActions}
            aria-label="Más acciones"
          >
            <MoreGlyph className="size-4" />
            Acciones
          </Button>
        ) : null}
      </div>

      <div className="flex items-start gap-4">
        <Avatar name={fullName} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold leading-tight text-foreground">
              {fullName}
            </h1>
            <Badge variant={segmentVariant}>{segmentLabel}</Badge>
          </div>
          <ContactLine
            email={customer.email}
            phone={customer.phone}
          />
          <MetaLine
            enrolledAt={customer.enrolledAt}
            lastInteractionAt={customer.lastInteractionAt}
            lastOrderAt={customer.lastOrderAt}
          />
        </div>
      </div>
    </header>
  );
}

function ContactLine({
  email,
  phone,
}: {
  email: string | null;
  phone: string | null;
}) {
  if (!email && !phone) return null;
  return (
    <p className="mt-0.5 truncate text-sm text-muted-foreground">
      {[email, phone].filter(Boolean).join(" · ")}
    </p>
  );
}

function MetaLine({
  enrolledAt,
  lastInteractionAt,
  lastOrderAt,
}: {
  enrolledAt: string;
  lastInteractionAt: string | null;
  lastOrderAt: string | null;
}) {
  const since = formatSince(enrolledAt);
  const lastVisit = pickLastVisit(lastInteractionAt, lastOrderAt);

  return (
    <p className="mt-1 text-xs text-muted-foreground">
      <span>Clienta desde {since}</span>
      {lastVisit ? (
        <>
          <span aria-hidden> · </span>
          <span>Última visita: {lastVisit}</span>
        </>
      ) : null}
    </p>
  );
}

function formatSince(iso: string): string {
  return format(new Date(iso), "MMM yyyy", { locale: es });
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
