"use client";

import type { Product } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { parseShadeOptions } from "./constants";

export function ShadeStep({
  product,
  shadeCode,
  customCode,
  onPickSwatch,
  onCustomChange,
}: {
  product: Product;
  shadeCode: string;
  customCode: string;
  onPickSwatch: (code: string) => void;
  onCustomChange: (v: string) => void;
}) {
  // Shade swatches now live on product_variants — until the variants endpoint
  // is wired here, the picker falls back to the free-text input below.
  const options = parseShadeOptions(undefined);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-heading text-xl tracking-tight text-foreground">
          ¿Qué tono?
        </h3>
        <p className="text-[12px] text-muted-foreground">
          {product.brand?.displayName ? `${product.brand.displayName} · ` : ""}
          {product.title}
        </p>
      </div>

      {options.length > 0 ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Tonos disponibles
          </p>
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {options.map((o) => {
              const active = shadeCode === o.code;
              return (
                <li key={o.code}>
                  <button
                    type="button"
                    onClick={() => onPickSwatch(o.code)}
                    className={cn(
                      "group flex w-full flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-150",
                      active
                        ? "border-foreground shadow-sm"
                        : "border-border/40 hover:border-foreground/30",
                    )}
                  >
                    <span
                      className={cn(
                        "size-10 rounded-full ring-2 transition-all",
                        active ? "ring-foreground" : "ring-transparent",
                        !o.hex && "bg-muted",
                      )}
                      style={o.hex ? { backgroundColor: o.hex } : undefined}
                      aria-hidden
                    />
                    <span className="text-[10px] font-medium tabular-nums text-foreground">
                      {o.code}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {options.length > 0 ? "O escribe otro código" : "Código del tono"}
        </p>
        <input
          type="text"
          value={customCode}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="N°2 Lys Rosé"
          maxLength={50}
          className={cn(
            "h-10 w-full rounded-xl border border-border bg-transparent px-3.5 text-sm outline-none transition-colors",
            "placeholder:text-muted-foreground/50",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          )}
        />
      </div>
    </div>
  );
}
