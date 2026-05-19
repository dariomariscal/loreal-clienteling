"use client";

import { ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const CATEGORY_LABEL: Record<string, string> = {
  skincare: "Skincare",
  makeup: "Maquillaje",
  fragrance: "Fragancia",
};

const CATEGORY_VARIANT: Record<string, "info" | "default" | "warning"> = {
  skincare: "info",
  makeup: "default",
  fragrance: "warning",
};

interface ProductPreviewCardProps {
  name: string;
  brandName?: string;
  category?: string;
  price: number;
  imageUrl?: string;
  sku?: string;
}

/**
 * Mirrors the shopper-facing card used on the catalog grid so users see
 * what the BA will see in the mobile app.
 */
export function ProductPreviewCard({
  name,
  brandName,
  category,
  price,
  imageUrl,
  sku,
}: ProductPreviewCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon className="size-10 text-muted-foreground/30" />
          </div>
        )}
        {category && (
          <div className="absolute left-2 top-2">
            <Badge
              variant={CATEGORY_VARIANT[category] ?? "secondary"}
              size="sm"
              className="shadow-sm"
            >
              {CATEGORY_LABEL[category] ?? category}
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3">
        {brandName && (
          <div className="mb-0.5 text-[11px] text-muted-foreground">
            {brandName}
          </div>
        )}
        <h3 className="mb-1 line-clamp-2 text-sm font-medium leading-tight">
          {name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold tabular-nums">
            ${price.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
          {sku && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {sku}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
