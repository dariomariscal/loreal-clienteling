"use client";

import type { Product } from "@/lib/hooks";
import { ProductPicker } from "@/components/dashboard/product-picker";
import { CATEGORIES } from "./constants";

export function ProductStep({
  category,
  selectedId,
  onPick,
}: {
  category: string;
  selectedId?: string;
  onPick: (p: Product) => void;
}) {
  return (
    <div className="flex h-full min-h-[420px] flex-col gap-3">
      <h3 className="font-heading text-xl tracking-tight text-foreground">
        Elige el producto
      </h3>
      <p className="text-[12px] text-muted-foreground">
        Filtrado por categoría:{" "}
        <span className="text-foreground">
          {CATEGORIES.find((c) => c.value === category)?.label ?? category}
        </span>
      </p>
      <div className="min-h-0 flex-1">
        <ProductPicker
          onSelect={onPick}
          selectedIds={selectedId ? new Set([selectedId]) : undefined}
          gridClassName="grid-cols-2 sm:grid-cols-3"
        />
      </div>
    </div>
  );
}
