"use client";

import * as React from "react";
import { useCreatePurchase } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ProductPicker } from "@/components/dashboard/product-picker";
import { cn } from "@/lib/utils";
import { useCart } from "./use-cart";
import { TicketLine, EmptyTicket } from "./ticket-line";

// Purchase composer — POS-style split view.
// Left 60%: visual product catalog (tap to add).
// Right 40%: live ticket with qty steppers, line totals, big confirm CTA.
// Inspired by Square POS / Apple Store iPad checkout.

interface PurchaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function PurchaseSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: PurchaseSheetProps) {
  const {
    cart,
    reset,
    addProduct,
    updateQty,
    removeLine,
    total,
    itemCount,
    selectedIds,
  } = useCart();
  const [posRef, setPosRef] = React.useState("");
  const createPurchase = useCreatePurchase();

  React.useEffect(() => {
    if (open) {
      reset();
      setPosRef("");
      createPurchase.reset();
    }
    // createPurchase identity changes every render in React Query; keying off
    // `open` avoids the resulting infinite reset loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleConfirm() {
    if (cart.length === 0 || createPurchase.isPending) return;
    createPurchase.mutate(
      {
        customerId,
        source: "manual",
        items: cart.map((l) => ({
          productId: l.product.id,
          sku: l.product.sku,
          quantity: l.quantity,
          unitPrice: Number(l.product.price),
        })),
        totalAmount: total,
        ...(posRef.trim() ? { posTransactionId: posRef.trim() } : {}),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="xl"
        className="max-w-[min(96vw,1180px)]! sm:max-w-[min(96vw,1180px)]!"
      >
        <SheetHeader>
          <SheetTitle>Registrar compra</SheetTitle>
          <SheetDescription>
            Para <span className="text-foreground">{customerName}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[1.45fr_1fr]">
          <div className="flex min-h-0 flex-col gap-4 border-r border-border/40 p-5">
            <ProductPicker
              onSelect={addProduct}
              selectedIds={selectedIds}
              multi
              gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
            />
          </div>

          <div className="flex min-h-0 flex-col bg-muted/20">
            <div className="flex items-baseline justify-between border-b border-border/40 px-5 py-4">
              <div>
                <p className="font-heading text-base text-foreground">Ticket</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {itemCount === 0
                    ? "Sin productos"
                    : itemCount === 1
                      ? "1 producto"
                      : `${itemCount} productos`}
                </p>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={reset}
                  className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                >
                  Vaciar
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {cart.length === 0 ? (
                <EmptyTicket />
              ) : (
                <ul className="space-y-1.5">
                  {cart.map((line) => (
                    <TicketLine
                      key={line.product.id}
                      line={line}
                      onInc={() => updateQty(line.product.id, +1)}
                      onDec={() => updateQty(line.product.id, -1)}
                      onRemove={() => removeLine(line.product.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 border-t border-border/40 bg-background px-5 py-4">
              <div className="space-y-1">
                <label
                  htmlFor="pos-ref"
                  className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Folio POS (opcional)
                </label>
                <input
                  id="pos-ref"
                  type="text"
                  value={posRef}
                  onChange={(e) => setPosRef(e.target.value)}
                  placeholder="POS-12345"
                  disabled={createPurchase.isPending}
                  className={cn(
                    "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm tabular-nums outline-none transition-colors",
                    "placeholder:text-muted-foreground/50",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                  )}
                />
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Total
                </span>
                <span className="font-heading text-2xl tabular-nums text-foreground">
                  ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {createPurchase.isError && (
                <Badge variant="destructive" className="w-full justify-center">
                  No se pudo registrar la compra. Intenta de nuevo.
                </Badge>
              )}

              <div className="flex gap-2">
                <SheetClose>
                  <Button
                    variant="ghost"
                    disabled={createPurchase.isPending}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </SheetClose>
                <Button
                  onClick={handleConfirm}
                  disabled={cart.length === 0 || createPurchase.isPending}
                  className="flex-2"
                >
                  {createPurchase.isPending
                    ? "Registrando…"
                    : `Confirmar venta · $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
