"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronRightGlyph, SparkleDotGlyph } from "@/components/ui/glyphs";

interface CustomerSummaryCardProps {
  customerId: string;
  firstName: string;
  lastName: string;
  rationale: string;
  suggestedAction: string;
  reason?: string;
  isVip?: boolean;
  className?: string;
}

// VISUAL DEVICE: horizontal card with shadow-xs elevation.
//
// Used on /ba/today for the "Importan hoy" block. The card format is
// chosen deliberately here — these 5 customers are heterogeneous,
// equivalent decisions that the BA scans and picks one. NN/g: cards
// work best for heterogeneous browse-and-pick scenarios.
//
// Within the card, the rationale uses a sparkle dot to signal AI origin
// honestly (Explainable Rationale pattern). The suggested action is a
// link with chevron — not a primary button, because each card is one
// of five equivalent options, not a single dominant action.
export function CustomerSummaryCard({
  customerId,
  firstName,
  lastName,
  rationale,
  suggestedAction,
  isVip,
  className,
}: CustomerSummaryCardProps) {
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <Link
      href={`/ba/customers/${customerId}`}
      className={cn(
        "group relative flex items-start gap-3.5 rounded-xl border border-border/40 bg-card px-4 py-3.5 shadow-xs transition-all",
        "hover:border-foreground/15 hover:shadow-sm",
        className,
      )}
    >
      <Avatar name={fullName} size="default" />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-[15px] font-medium text-foreground">{fullName}</p>
          {isVip ? (
            <Badge variant="success" size="sm" className="shrink-0">
              VIP
            </Badge>
          ) : null}
        </div>

        <p className="flex items-start gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
          <SparkleDotGlyph className="size-3 shrink-0 translate-y-1 text-[var(--ba-accent)]" />
          <span className="line-clamp-2">{rationale}</span>
        </p>

        <p className="pt-1 text-[12px] font-medium text-foreground/80 transition-colors group-hover:text-[var(--ba-accent)]">
          {suggestedAction}
        </p>
      </div>

      <ChevronRightGlyph className="size-4 shrink-0 self-center text-muted-foreground/50 transition-colors group-hover:text-foreground/70" />
    </Link>
  );
}
