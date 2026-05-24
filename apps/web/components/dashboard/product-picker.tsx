"use client";

import * as React from "react";
import { useProducts, type Product } from "@/lib/hooks";
import { useProductSemanticSearch } from "@/lib/hooks/use-products";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Shared visual catalog ──────────────────────────────────────────
// Reused by purchase cart, recommendation picker, and message attach.
// Each consumer passes an onSelect callback; we don't own the
// downstream state so the same grid serves three different flows.

interface ProductPickerProps {
  onSelect: (product: Product) => void;
  selectedIds?: Set<string>;
  /** Show a thin "added" indicator on selected cards instead of disabling. */
  multi?: boolean;
  /** Optional pre-filter, e.g. by brand of the customer's preferred brand. */
  brandId?: string;
  /** Class applied to the grid container; consumer can swap to 2-col, etc. */
  gridClassName?: string;
  /** Number of products to show; defaults to 60 for a comfortable scroll. */
  limit?: number;
}

const QUICK_CATEGORIES = [
  { key: "", label: "Todos" },
  { key: "skincare", label: "Skincare" },
  { key: "makeup", label: "Maquillaje" },
  { key: "fragrance", label: "Fragancia" },
  { key: "haircare", label: "Cabello" },
] as const;

export function ProductPicker({
  onSelect,
  selectedIds,
  multi = false,
  gridClassName,
  limit = 60,
}: ProductPickerProps) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("");
  const [semanticMode, setSemanticMode] = React.useState(false);
  // Debounce the search so we don't hammer the API on every keystroke; the
  // grid feels live below ~200ms but saves ~10 requests per query.
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const lexicalQuery = useProducts(
    {
      limit: String(limit),
      ...(category ? { category } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    },
    { enabled: !semanticMode || !debouncedSearch },
  );

  // Semantic search ignores the category chips — embeddings already encode
  // category, and forcing it would defeat the purpose of phrase queries like
  // "algo para arrugas finas".
  const semanticQuery = useProductSemanticSearch(
    debouncedSearch,
    limit,
    { enabled: semanticMode && debouncedSearch.length >= 2 },
  );

  const products: Product[] = semanticMode
    ? (semanticQuery.data ?? []).map((r) => ({
        id: r.productId,
        sku: r.sku,
        brandId: r.brandId,
        name: r.name,
        category: r.category,
        subcategory: r.subcategory,
        description: null,
        price: r.price,
        images: null,
        ingredients: null,
        shadeOptions: null,
        estimatedDurationDays: null,
        technicalSheetUrl: null,
        tutorialUrl: null,
        salesArgument: null,
        active: true,
        createdAt: "",
        updatedAt: "",
        brand: r.brandName
          ? { id: r.brandId, displayName: r.brandName, code: "" }
          : undefined,
      }))
    : lexicalQuery.data ?? [];
  const isLoading = semanticMode ? semanticQuery.isFetching : lexicalQuery.isLoading;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              semanticMode
                ? "Describe lo que buscas (ej. \"algo para arrugas finas\")"
                : "Buscar por nombre, SKU o referencia"
            }
            className="pl-9"
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={() => setSemanticMode((v) => !v)}
          aria-pressed={semanticMode}
          title="Búsqueda inteligente por descripción"
          className={cn(
            "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-150",
            semanticMode
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          )}
        >
          IA
        </button>
      </div>

      {/* Category chips — hidden in semantic mode because embeddings already
          encode category, and forcing a chip would over-constrain the query. */}
      {semanticMode ? null : (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <button
                key={c.key || "all"}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          "rounded-2xl border border-border/40 bg-muted/10 p-3",
        )}
      >
        {isLoading ? (
          <div className={cn("grid gap-3", gridClassName ?? "grid-cols-2 sm:grid-cols-3")}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-xl bg-muted/40"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm text-foreground">Sin resultados</p>
            <p className="text-xs text-muted-foreground">
              Intenta otra categoría o limpia la búsqueda.
            </p>
          </div>
        ) : (
          <ul
            className={cn(
              "grid gap-3",
              gridClassName ?? "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                selected={selectedIds?.has(p.id) ?? false}
                multi={multi}
                onSelect={() => onSelect(p)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  selected,
  multi,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  multi: boolean;
  onSelect: () => void;
}) {
  const image = product.images?.[0];
  const price = Number(product.price);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group/card relative flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all duration-200",
          selected
            ? "border-accent ring-2 ring-accent/30"
            : "border-border/60 hover:border-foreground/30 hover:shadow-sm",
        )}
      >
        {/* Image surface */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/40">
              <PackageIcon className="size-8" />
            </div>
          )}
          {selected && (
            <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm">
              {multi ? (
                <PlusIcon className="size-3.5" />
              ) : (
                <CheckIcon className="size-3.5" />
              )}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          {product.brand?.displayName && (
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {product.brand.displayName}
            </p>
          )}
          <p className="line-clamp-2 font-heading text-[13px] leading-[1.3] text-foreground">
            {product.name}
          </p>
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-[13px] font-medium tabular-nums text-foreground">
              {price > 0
                ? `$${price.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`
                : "—"}
            </span>
            <Badge variant="ghost" size="sm" className="text-[10px]">
              {product.sku}
            </Badge>
          </div>
        </div>
      </button>
    </li>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m13 13-2.6-2.6" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
