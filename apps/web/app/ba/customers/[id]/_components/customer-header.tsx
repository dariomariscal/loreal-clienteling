"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "@/lib/hooks/use-customers";

interface CustomerHeaderProps {
  customer: Customer | undefined;
  isLoading: boolean;
}

// Identity header — plain, no card. Name + sub-identity + channel buttons.
// Channel buttons are 44pt to satisfy HIG; they open the OS-native app
// (tel:, mailto:, https://wa.me/) rather than an in-app stub.
export function CustomerHeader({ customer, isLoading }: CustomerHeaderProps) {
  if (isLoading || !customer) {
    return (
      <div className="flex items-center gap-4" aria-busy="true">
        <div className="size-16 animate-pulse rounded-full bg-muted/60" />
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded-md bg-muted/60" />
          <div className="h-4 w-40 animate-pulse rounded-md bg-muted/40" />
        </div>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const isVip = customer.lifecycleStage === "vip";
  const enrolledYear = new Date(customer.enrolledAt).getFullYear();

  return (
    <header className="flex items-start gap-4">
      <Avatar name={fullName} size="xl" />

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-center gap-2">
          <h1
            className={cn(
              "text-[28px] font-semibold tracking-tight text-foreground",
            )}
            style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
          >
            {fullName}
          </h1>
          {isVip ? (
            <Badge variant="success" size="sm">
              VIP
            </Badge>
          ) : null}
        </div>

        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Clienta desde {enrolledYear}
        </p>

        <div className="mt-3 flex items-center gap-1.5">
          {customer.phone ? (
            <ChannelButton
              href={`tel:${customer.phone}`}
              label="Llamar"
              glyph={<PhoneGlyph className="size-4" />}
            />
          ) : null}
          {customer.email ? (
            <ChannelButton
              href={`mailto:${customer.email}`}
              label="Email"
              glyph={<EmailGlyph className="size-4" />}
            />
          ) : null}
          {customer.phone ? (
            <ChannelButton
              href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
              label="WhatsApp"
              glyph={<WhatsappGlyph className="size-4" />}
              external
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}

// ── Channel button — 44pt HIG-friendly icon button ─────────────────

function ChannelButton({
  href,
  label,
  glyph,
  external,
}: {
  href: string;
  label: string;
  glyph: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex size-9 items-center justify-center rounded-md border border-border/50 bg-card text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
    >
      {glyph}
    </a>
  );
}

// ── Inline glyphs — channel-specific (local; one-off use) ──────────

function PhoneGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function EmailGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function WhatsappGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M5 20l1.4-4.2a8 8 0 1 1 2.8 2.8L5 20Z" />
      <path d="M9.5 10c.5 2.5 2 4 4.5 4.5l1-1.5 2 .8a4 4 0 0 1-5.3 1A6 6 0 0 1 8 9.5l.8 2 1.5-1Z" />
    </svg>
  );
}
