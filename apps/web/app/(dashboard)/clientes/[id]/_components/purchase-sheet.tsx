"use client";

import * as React from "react";
import { useCreatePurchase, type Product } from "@/lib/hooks";
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

// ── Purchase composer — POS-style split view ───────────────────────
// Left 60%: visual product catalog (tap to add).
// Right 40%: live ticket with qty steppers, line totals, big confirm CTA.
// Inspired by Square POS / Apple Store iPad checkout.

interface PurchaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

interface CartLine {
  product: Product;
  quantity: number;
}

export function PurchaseSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: PurchaseSheetProps) {
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [posRef, setPosRef] = React.useState("");
  const createPurchase = useCreatePurchase();

  React.useEffect(() => {
    if (open) {
      setCart([]);
      setPosRef("");
      createPurchase.reset();
    }
    // createPurchase identity changes on every render in React Query; depending
    // on it would cause the effect to re-run on each render, retriggering the
    // resets and creating an infinite loop. Keying off `open` is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedIds = React.useMemo(
    () => new Set(cart.map((l) => l.product.id)),
    [cart],
  );

  function addProduct(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== productId) return [l];
        const next = l.quantity + delta;
        if (next <= 0) return [];
        return [{ ...l, quantity: next }];
      }),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const total = cart.reduce(
    (sum, l) => sum + Number(l.product.price) * l.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

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
          {/* ─── LEFT: catalog ─────────────────────────────────────── */}
          <div className="flex min-h-0 flex-col gap-4 border-r border-border/40 p-5">
            <ProductPicker
              onSelect={addProduct}
              selectedIds={selectedIds}
              multi
              gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
            />
          </div>

          {/* ─── RIGHT: live ticket ────────────────────────────────── */}
          <div className="flex min-h-0 flex-col bg-muted/20">
            {/* Ticket header */}
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
                  onClick={() => setCart([])}
                  className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Lines */}
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

            {/* Total + confirm */}
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

// ── Pieces ────────────────────────────────────────────────────────

function TicketLine({
  line,
  onInc,
  onDec,
  onRemove,
}: {
  line: CartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const image = line.product.images?.[0];
  const lineTotal = Number(line.product.price) * line.quantity;

  return (
    <li className="flex gap-3 rounded-xl border border-border/40 bg-background p-2.5">
      {/* Thumb */}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted/40">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[13px] leading-tight text-foreground">
              {line.product.name}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {line.product.sku}
            </p>
          </div>
          <button
            onClick={onRemove}
            aria-label="Quitar"
            className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <XIcon className="size-3" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <Stepper
            value={line.quantity}
            onDec={onDec}
            onInc={onInc}
          />
          <span className="text-[13px] font-medium tabular-nums text-foreground">
            ${lineTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </li>
  );
}

function Stepper({
  value,
  onInc,
  onDec,
}: {
  value: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-0 rounded-full border border-border/60 bg-background">
      <button
        type="button"
        onClick={onDec}
        aria-label="Disminuir"
        className="flex size-6 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MinusIcon className="size-3" />
      </button>
      <span className="min-w-5 text-center text-[12px] font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Aumentar"
        className="flex size-6 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <PlusIcon className="size-3" />
      </button>
    </div>
  );
}

function EmptyTicket() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
        <BagIcon className="size-5" />
      </div>
      <p className="font-heading text-sm text-foreground">Ticket vacío</p>
      <p className="text-[12px] leading-snug text-muted-foreground">
        Toca un producto del catálogo para agregarlo a la venta.
      </p>
    </div>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 8h10" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function BagIcon({ className }: { className?: string }) {
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
      <path d="M5 8h14l-1.5 12.5a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5L5 8z" />
      <path d="M9 8V5.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}
