"use client";

import type { CartLine } from "./use-cart";
import { MinusIcon, PlusIcon, XIcon, BagIcon } from "./icons";

export function TicketLine({
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

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[13px] leading-tight text-foreground">
              {line.product.title}
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
          <Stepper value={line.quantity} onDec={onDec} onInc={onInc} />
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

export function EmptyTicket() {
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
