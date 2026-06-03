"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { formatMoney } from "@/components/advisor/customer-vocabulary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartGlyph, CloseGlyph } from "@/components/ui/glyphs";
import {
  useCustomerWishlists,
  useRemoveWishlistItem,
  type Wishlist,
  type WishlistItem,
} from "@/lib/hooks/use-wishlists";

interface Props {
  customerId: string;
}

/**
 * Wishlist tab — grid of product cards grouped per wishlist. Each card shows
 * the resolved hero image (variant fallback → product image), brand, title,
 * shade/size label, price and the BA's optional note. Variants today rarely
 * ship with their own imageUrl, so the server-side enrichment in
 * WishlistsService.enrichItems already falls back to the product image; the
 * UI just renders what's given.
 *
 * The section gracefully handles N wishlists per customer (the BA's manual
 * lookbooks + the scanner's auto-provisioned "Wishlist") with a header per
 * list and a removable item action.
 */
export function WishlistSection({ customerId }: Props) {
  const { data, isLoading } = useCustomerWishlists(customerId);

  if (isLoading) {
    return (
      <SectionCard title="Lista de deseos">
        <WishlistSkeleton />
      </SectionCard>
    );
  }

  const populated = (data ?? []).filter((w) => (w.items ?? []).length > 0);
  const totalItems = populated.reduce((n, w) => n + (w.items?.length ?? 0), 0);

  if (totalItems === 0) {
    return (
      <SectionCard title="Lista de deseos">
        <div className="px-4 py-6">
          <AdvisorEmptyState
            icon={<HeartGlyph className="size-6" />}
            title="Aún sin productos guardados"
            description="Escanea un producto desde su perfil o agrega manualmente para empezar su wishlist."
          />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Lista de deseos"
      action={
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {totalItems} {totalItems === 1 ? "producto" : "productos"}
        </span>
      }
    >
      <div className="flex flex-col gap-7 px-4 pt-2 pb-4">
        {populated.map((wl) => (
          <WishlistGroup key={wl.id} wishlist={wl} />
        ))}
      </div>
    </SectionCard>
  );
}

function WishlistGroup({ wishlist }: { wishlist: Wishlist & { items: WishlistItem[] } }) {
  const items = wishlist.items ?? [];
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-sm text-foreground">
            {wishlist.name}
          </h3>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {wishlist.kind === "lookbook" ? "Lookbook" : "Wishlist"} ·{" "}
            {items.length} {items.length === 1 ? "pieza" : "piezas"}
          </p>
        </div>
        {wishlist.sharedAt ? (
          <Badge variant="outline" className="text-[10px]">
            Compartida
          </Badge>
        ) : null}
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <WishlistCard key={item.id} item={item} wishlistId={wishlist.id} />
        ))}
      </ul>
    </section>
  );
}

function WishlistCard({
  item,
  wishlistId,
}: {
  item: WishlistItem;
  wishlistId: string;
}) {
  const remove = useRemoveWishlistItem();
  const image = item.variant?.imageUrl ?? item.product.imageUrl;
  const price = item.variant?.price ?? null;

  function handleRemove() {
    if (remove.isPending) return;
    remove.mutate(
      { wishlistId, itemId: item.id },
      {
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "No pudimos quitarlo",
          ),
      },
    );
  }

  return (
    <li className="group relative flex flex-col gap-2 rounded-xl border border-border/60 bg-background p-2.5 transition-colors hover:border-border">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40">
        {image ? (
          <Image
            src={image}
            alt={item.product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/40">
            <HeartGlyph className="size-7" />
          </div>
        )}
        {item.variant?.swatchHex ? (
          <span
            aria-hidden
            title={item.variant.optionLabel ?? undefined}
            className="absolute bottom-1.5 right-1.5 size-5 rounded-full border-2 border-background shadow"
            style={{ backgroundColor: item.variant.swatchHex }}
          />
        ) : null}
        <button
          type="button"
          onClick={handleRemove}
          disabled={remove.isPending}
          aria-label="Quitar de wishlist"
          className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive disabled:opacity-40"
        >
          <CloseGlyph className="size-3.5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 px-0.5 pb-0.5">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {item.product.brand.displayName}
        </p>
        <p className="line-clamp-2 font-heading text-[13px] leading-tight text-foreground">
          {item.product.title}
        </p>
        {item.variant?.optionLabel ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {item.variant.optionLabel}
          </p>
        ) : null}
        {price !== null ? (
          <p className="mt-0.5 text-[12px] font-medium tabular-nums text-foreground">
            {formatMoney(price)}
          </p>
        ) : null}
        {item.note ? (
          <p className="mt-1 line-clamp-2 rounded bg-muted/40 px-1.5 py-1 text-[11px] italic leading-snug text-muted-foreground">
            “{item.note}”
          </p>
        ) : null}
      </div>
    </li>
  );
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background p-2.5"
        >
          <div className="aspect-square w-full animate-pulse rounded-lg bg-muted/50" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}
