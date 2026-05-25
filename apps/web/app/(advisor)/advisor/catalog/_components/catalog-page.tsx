"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { useProducts } from "@/lib/hooks/use-products";
import { PackageGlyph, SearchGlyph } from "@/components/ui/glyphs";
import type { Product } from "@/lib/hooks/use-products";

export function CatalogPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProducts({
    limit: "60",
    search: search.trim() || undefined,
  });

  return (
    <SingleColumn>
      <header className="border-b border-border bg-background px-10 py-6 lg:px-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div>
            <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
              Catalog
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse and add products to a recommendation
            </p>
          </div>
          <div className="relative max-w-md">
            <SearchGlyph
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-10 py-10 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">
          {isLoading ? (
            <GridSkeleton />
          ) : !data || data.length === 0 ? (
            <AdvisorEmptyState
              icon={<PackageGlyph className="size-6" />}
              title="No products found"
            />
          ) : (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {data.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SingleColumn>
  );
}

function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0];
  return (
    <article className="group flex flex-col gap-3">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(min-width: 1280px) 240px, (min-width: 768px) 30vw, 45vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <PackageGlyph className="size-8" />
          </div>
        )}
      </div>
      <div>
        {product.brand ? (
          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
            {product.brand.displayName}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-medium text-foreground">
          {product.title}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatPrice(product.price)}
        </p>
      </div>
    </article>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-3">
          <div className="aspect-[4/5] w-full animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatPrice(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}
