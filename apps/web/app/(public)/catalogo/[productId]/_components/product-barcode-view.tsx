"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import Barcode from "react-barcode";
import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/constants";

interface PublicVariant {
  id: string;
  sku: string;
  barcode: string | null;
  title: string;
  optionLabel: string;
  price: number;
  imageUrl: string | null;
  swatchHex: string | null;
}

interface PublicProductDetail {
  id: string;
  sku: string;
  barcode: string | null;
  title: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  brand: { id: string; code: string; displayName: string };
  variants: PublicVariant[];
}

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Detail view for the public showroom. Renders the product photo plus, for
 * each variant, a CODE128/EAN-13 barcode the BA can scan straight off the
 * customer's phone screen with the in-store scanner. SKU is rendered as
 * monospaced text underneath so the BA can also type it manually if the
 * scanner can't read the screen glare.
 *
 * Code format detection: react-barcode auto-picks CODE128 unless we hint EAN.
 * Our `variant.barcode` values are mixed (raw seed SKUs + EAN-13 retail codes),
 * so we treat the field as opaque and let the BA's scanner figure it out.
 * Falling back to `sku` keeps the page useful when `barcode` isn't populated.
 */
export function ProductBarcodeView({ productId }: { productId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-catalog", "product", productId],
    queryFn: () =>
      fetchPublic<PublicProductDetail>(`/public/catalog/${productId}`),
  });

  const [selectedVariantId, setSelectedVariantId] = React.useState<
    string | null
  >(null);

  // Default to the first variant whenever the product loads or changes.
  React.useEffect(() => {
    if (data && !selectedVariantId && data.variants.length > 0) {
      setSelectedVariantId(data.variants[0].id);
    }
  }, [data, selectedVariantId]);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="font-heading text-base text-foreground">
          No encontramos este producto.
        </p>
        <Link
          href="/catalogo"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const selectedVariant =
    data.variants.find((v) => v.id === selectedVariantId) ??
    data.variants[0] ??
    null;

  // Prefer the explicit barcode when present (real EAN-13 / UPC). Fall back to
  // SKU so the BA's scanner still has something to consume — our local seed
  // doesn't populate barcode for every variant.
  const codeToRender = selectedVariant?.barcode ?? selectedVariant?.sku ?? "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:py-10">
      <nav className="flex items-center text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <Link
          href="/catalogo"
          className="hover:text-foreground"
          aria-label="Volver al catálogo"
        >
          ← Catálogo
        </Link>
      </nav>

      <header className="flex flex-col items-start gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {data.brand.displayName}
        </p>
        <h1 className="font-heading text-2xl leading-tight text-foreground sm:text-3xl">
          {data.title}
        </h1>
      </header>

      <div className="grid gap-6 sm:grid-cols-[1fr_1fr] sm:gap-8">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/30">
          {selectedVariant?.imageUrl || data.imageUrl ? (
            <Image
              src={selectedVariant?.imageUrl ?? data.imageUrl ?? ""}
              alt={data.title}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
              priority
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground/40">
              Sin imagen
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {data.variants.length > 1 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Elige presentación
              </p>
              <div className="flex flex-wrap gap-2">
                {data.variants.map((v) => (
                  <VariantPill
                    key={v.id}
                    variant={v}
                    active={selectedVariant?.id === v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {selectedVariant ? (
            <ScanCard variant={selectedVariant} codeToRender={codeToRender} />
          ) : null}

          {data.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {data.description}
            </p>
          ) : null}
        </div>
      </div>

      <p className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
        Muéstrale esta pantalla a tu asesora. Ella escanea el código desde tu
        teléfono y queda registrado al instante.
      </p>
    </div>
  );
}

function VariantPill({
  variant,
  active,
  onClick,
}: {
  variant: PublicVariant;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")
      }
    >
      {variant.swatchHex ? (
        <span
          aria-hidden
          className="size-3 rounded-full border border-background/60"
          style={{ backgroundColor: variant.swatchHex }}
        />
      ) : null}
      {variant.optionLabel || variant.title}
    </button>
  );
}

function ScanCard({
  variant,
  codeToRender,
}: {
  variant: PublicVariant;
  codeToRender: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-heading text-base text-foreground">
          {variant.optionLabel || variant.title}
        </p>
        <p className="text-sm font-medium tabular-nums text-foreground">
          {new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            maximumFractionDigits: 0,
          }).format(variant.price)}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4">
        {codeToRender ? (
          <Barcode
            value={codeToRender}
            displayValue={false}
            height={70}
            width={1.8}
            margin={0}
            background="transparent"
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Esta variante aún no tiene código.
          </p>
        )}
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {codeToRender || "—"}
        </p>
      </div>

      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        SKU {variant.sku}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="h-3 w-24 animate-pulse rounded bg-muted/50" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-muted/50" />
      <div className="grid gap-6 sm:grid-cols-[1fr_1fr]">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted/40" />
        <div className="flex flex-col gap-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted/40" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-muted/40" />
          <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted/30" />
        </div>
      </div>
    </div>
  );
}
