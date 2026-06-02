"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { PackageGlyph } from "@/components/ui/glyphs";

/**
 * A minimal projection of a scan-session item — the strip never needs the
 * full lookup payload, just enough to render a thumbnail and re-open the
 * sheet by variantId. Keeping it tiny lets the camera stage hold the strip
 * in a `useState<ScanRecentItem[]>` without dragging in heavier types.
 */
export interface ScanRecentItem {
  variantId: string;
  brandName: string;
  productTitle: string;
  imageUrl: string | null;
  swatchHex: string | null;
}

interface ScanRecentStripProps {
  items: ScanRecentItem[];
  /** Re-open the bottom sheet for a previously scanned variant. */
  onSelect: (variantId: string) => void;
  className?: string;
}

/**
 * Horizontal strip of the last ~5 scans in the current camera session.
 * Mirrors `ProductCard` from /advisor/catalog at thumbnail scale: brand label
 * uppercase tracked-out, product title clamped to two lines. Tapping a card
 * re-opens the bottom sheet without re-scanning.
 *
 * Rendered nothing when empty — the camera stage decides placement.
 */
export function ScanRecentStrip({
  items,
  onSelect,
  className,
}: ScanRecentStripProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto overflow-x-auto overscroll-x-contain",
        className,
      )}
      aria-label="Escaneos recientes"
    >
      <ul className="flex items-stretch gap-2 px-4 py-2">
        {items.map((item) => (
          <li key={item.variantId} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(item.variantId)}
              className="group flex w-20 flex-col gap-1 text-left"
            >
              <ScanRecentThumbnail item={item} />
              <span className="line-clamp-1 text-[9px] font-medium uppercase tracking-[0.18em] text-background/80">
                {item.brandName}
              </span>
              <span className="line-clamp-2 text-[10px] leading-tight text-background/95">
                {item.productTitle}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScanRecentThumbnail({ item }: { item: ScanRecentItem }) {
  return (
    <div
      className="relative size-16 overflow-hidden rounded-lg ring-1 ring-background/20 transition-transform duration-150 group-hover:scale-[1.04]"
      style={
        item.swatchHex
          ? { backgroundColor: `${item.swatchHex}20` }
          : { backgroundColor: "color-mix(in oklab, var(--ba-accent-soft) 50%, transparent)" }
      }
    >
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.productTitle}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-background/80">
          <PackageGlyph className="size-5" />
        </div>
      )}
    </div>
  );
}
