"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PackageGlyph } from "@/components/ui/glyphs";

interface PurchaseRowProps {
  productName: string;
  imageUrl?: string | null;
  brandName?: string;
  purchasedAt: Date | string;
  amount: number;
  quantity?: number;
  className?: string;
}

// VISUAL DEVICE: list row with thumbnail. Apple Music style.
//
// NN/g rule: lists for homogeneous, scannable content. Purchase history
// is the canonical example — same shape, same priority, scanned by date
// or price. Price uses tabular-nums to align vertically without extra
// effort.
//
// The thumbnail is visual-first because, as the UX vision says, "las
// consultoras piensan en visual, no en SKUs". Brand name as secondary.
export function PurchaseRow({
  productName,
  imageUrl,
  brandName,
  purchasedAt,
  amount,
  quantity,
  className,
}: PurchaseRowProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-2.5 first:pt-0 last:pb-0",
        className,
      )}
    >
      <ProductThumbnail src={imageUrl} alt={productName} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] text-foreground">{productName}</p>
        <p className="truncate text-[12px] text-muted-foreground">
          {brandName ? <>{brandName} · </> : null}
          {formatPurchaseDate(purchasedAt)}
          {quantity && quantity > 1 ? <> · ×{quantity}</> : null}
        </p>
      </div>

      <p className="shrink-0 text-[14px] font-medium tabular-nums text-foreground">
        {formatPrice(amount)}
      </p>
    </li>
  );
}

// ── Thumbnail ─────────────────────────────────────────────────────

function ProductThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="size-11 shrink-0 rounded-lg object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      aria-hidden
    >
      <PackageGlyph className="size-5" />
    </span>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPurchaseDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 30) return `hace ${days}d`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `hace ${months}m`;
  }
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" });
}
