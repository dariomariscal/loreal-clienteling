"use client";

import { SectionCard } from "@/components/advisor/section-card";
import { useCustomerWishlists } from "@/lib/hooks/use-wishlists";

interface Props {
  customerId: string;
}

export function WishlistSection({ customerId }: Props) {
  const { data, isLoading } = useCustomerWishlists(customerId);

  const items = data?.flatMap((w) => w.items ?? []) ?? [];

  return (
    <SectionCard title="Lista de deseos">
      {isLoading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Aún no ha guardado nada en su lista de deseos.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="size-12 shrink-0 rounded-md bg-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  Producto #{item.productId.slice(0, 8)}
                </p>
                {item.note ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
