"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/constants";

interface PublicProduct {
  id: string;
  sku: string;
  title: string;
  category: string;
  imageUrl: string | null;
  brand: { id: string; code: string; displayName: string };
}

interface PublicBrand {
  id: string;
  code: string;
  displayName: string;
  productCount: number;
}

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Browse view for the public showroom. Customer-facing, mobile-first.
 *
 * Behaviour: the customer lands on /catalogo, sees a grid of every active
 * product across every brand, can filter by brand or search by name/SKU,
 * and taps a card to land on the detail page that renders the scannable
 * barcode. No login, no sidebar, no advisor chrome.
 */
export function CatalogBrowser() {
  const [brand, setBrand] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const brandsQ = useQuery({
    queryKey: ["public-catalog", "brands"],
    queryFn: () => fetchPublic<PublicBrand[]>("/public/catalog/brands"),
  });

  const productsQ = useQuery({
    queryKey: ["public-catalog", "products", brand, debouncedQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (brand) params.set("brand", brand);
      if (debouncedQuery) params.set("q", debouncedQuery);
      params.set("limit", "120");
      return fetchPublic<PublicProduct[]>(
        `/public/catalog?${params.toString()}`,
      );
    },
  });

  const products = productsQ.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Catálogo en tienda
        </p>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">
          Encuentra el producto que quieres mostrar a tu asesora
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Toca un producto para ver su código. La asesora lo escanea desde tu
          teléfono y queda registrado en tu lista al instante.
        </p>
      </header>

      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background/90 py-2 backdrop-blur">
        <input
          type="search"
          placeholder="Buscar por nombre, marca o SKU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <BrandPill
            label="Todas"
            active={brand === null}
            onClick={() => setBrand(null)}
          />
          {brandsQ.data?.map((b) => (
            <BrandPill
              key={b.id}
              label={b.displayName}
              active={brand?.toLowerCase() === b.code.toLowerCase()}
              onClick={() => setBrand(b.code)}
            />
          ))}
        </div>
      </div>

      {productsQ.isLoading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BrandPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors " +
        (active
          ? "bg-foreground text-background"
          : "border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <li>
      <Link
        href={`/catalogo/${product.id}`}
        className="group flex h-full flex-col gap-2 rounded-xl border border-border/60 bg-card p-2.5 transition-colors hover:border-border"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform group-hover:scale-[1.02]"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
              Sin imagen
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {product.brand.displayName}
          </p>
          <p className="line-clamp-2 font-heading text-[13px] leading-tight text-foreground">
            {product.title}
          </p>
        </div>
      </Link>
    </li>
  );
}

function ProductGridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2.5"
        >
          <div className="aspect-square w-full animate-pulse rounded-lg bg-muted/50" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted/50" />
          <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="font-heading text-base text-foreground">Sin resultados</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Prueba con otra búsqueda o cambia el filtro de marca.
      </p>
    </div>
  );
}
