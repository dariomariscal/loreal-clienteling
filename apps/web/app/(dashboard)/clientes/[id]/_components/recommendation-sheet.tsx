"use client";

import * as React from "react";
import { useCreateRecommendation, type Product } from "@/lib/hooks";
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

// ── Recommendation composer — Look Builder ─────────────────────────
// Left: visual product catalog (reused from purchase flow).
// Right: "Recomendaciones de hoy" panel — each product is a row with a
// per-product reason textarea. Visit reason is a single picker at the top
// because it applies to the whole consultation (Sephora pattern).

interface RecommendationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

interface DraftLine {
  product: Product;
  notes: string;
}

const VISIT_REASONS = [
  { value: "new_purchase", label: "Nueva compra", emoji: "🛍️" },
  { value: "rebuy", label: "Recompra", emoji: "🔁" },
  { value: "gift", label: "Regalo", emoji: "🎁" },
  { value: "concern", label: "Preocupación", emoji: "💭" },
  { value: "promotion", label: "Promoción", emoji: "✨" },
  { value: "browsing", label: "Exploración", emoji: "👀" },
] as const;

export function RecommendationSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: RecommendationSheetProps) {
  const [lines, setLines] = React.useState<DraftLine[]>([]);
  const [visitReason, setVisitReason] = React.useState<string | null>(null);
  const [submitState, setSubmitState] = React.useState<
    "idle" | "submitting" | "error"
  >("idle");

  const createRec = useCreateRecommendation();

  React.useEffect(() => {
    if (open) {
      setLines([]);
      setVisitReason(null);
      setSubmitState("idle");
    }
  }, [open]);

  const selectedIds = React.useMemo(
    () => new Set(lines.map((l) => l.product.id)),
    [lines],
  );

  function addProduct(product: Product) {
    setLines((prev) => {
      if (prev.some((l) => l.product.id === product.id)) {
        // Second tap removes — the catalog shows selection state so toggling
        // feels natural.
        return prev.filter((l) => l.product.id !== product.id);
      }
      return [...prev, { product, notes: "" }];
    });
  }

  function updateNotes(productId: string, notes: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.product.id === productId ? { ...l, notes: notes.slice(0, 1000) } : l,
      ),
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  async function handleConfirm() {
    if (lines.length === 0 || submitState === "submitting") return;
    setSubmitState("submitting");

    // The API takes one product per call, so we fan out in parallel. The
    // batch succeeds if all calls succeed; partial failures surface as a
    // single error message — the BA can then retry or remove offenders.
    try {
      await Promise.all(
        lines.map((l) =>
          createRec.mutateAsync({
            customerId,
            productId: l.product.id,
            source: "manual",
            ...(visitReason ? { visitReason } : {}),
            ...(l.notes.trim() ? { notes: l.notes.trim() } : {}),
          }),
        ),
      );
      onOpenChange(false);
    } catch {
      setSubmitState("error");
    }
  }

  const isSubmitting = submitState === "submitting";
  const canConfirm = lines.length > 0 && !isSubmitting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="xl"
        className="!max-w-[min(96vw,1180px)] !sm:max-w-[min(96vw,1180px)]"
      >
        <SheetHeader>
          <SheetTitle>Recomendar productos</SheetTitle>
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

          {/* ─── RIGHT: look board ─────────────────────────────────── */}
          <div className="flex min-h-0 flex-col bg-muted/20">
            {/* Header + visit reason */}
            <div className="space-y-3 border-b border-border/40 px-5 py-4">
              <div className="flex items-baseline justify-between">
                <p className="font-heading text-base text-foreground">
                  Recomendaciones de hoy
                </p>
                <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {lines.length === 0
                    ? "Sin productos"
                    : lines.length === 1
                      ? "1 producto"
                      : `${lines.length} productos`}
                </span>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Motivo de visita
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VISIT_REASONS.map((r) => {
                    const active = visitReason === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() =>
                          setVisitReason(active ? null : r.value)
                        }
                        disabled={isSubmitting}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        <span aria-hidden>{r.emoji}</span>
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Look list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {lines.length === 0 ? (
                <EmptyLook />
              ) : (
                <ul className="space-y-2">
                  {lines.map((line) => (
                    <LookLine
                      key={line.product.id}
                      line={line}
                      onChangeNotes={(v) => updateNotes(line.product.id, v)}
                      onRemove={() => removeLine(line.product.id)}
                      disabled={isSubmitting}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm */}
            <div className="space-y-3 border-t border-border/40 bg-background px-5 py-4">
              {submitState === "error" && (
                <Badge variant="destructive" className="w-full justify-center">
                  Algunas recomendaciones no se pudieron guardar. Intenta otra
                  vez.
                </Badge>
              )}
              <div className="flex gap-2">
                <SheetClose>
                  <Button
                    variant="ghost"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </SheetClose>
                <Button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="flex-[2]"
                >
                  {isSubmitting
                    ? "Guardando…"
                    : lines.length <= 1
                      ? "Guardar recomendación"
                      : `Guardar ${lines.length} recomendaciones`}
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

function LookLine({
  line,
  onChangeNotes,
  onRemove,
  disabled,
}: {
  line: DraftLine;
  onChangeNotes: (v: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const image = line.product.images?.[0];

  return (
    <li className="rounded-xl border border-border/40 bg-background p-2.5">
      <div className="flex gap-3">
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
              {line.product.brand?.displayName && (
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {line.product.brand.displayName}
                </p>
              )}
              <p className="truncate font-heading text-[13px] leading-tight text-foreground">
                {line.product.name}
              </p>
            </div>
            <button
              onClick={onRemove}
              disabled={disabled}
              aria-label="Quitar"
              className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        </div>
      </div>

      <textarea
        value={line.notes}
        onChange={(e) => onChangeNotes(e.target.value)}
        disabled={disabled}
        placeholder="¿Por qué se lo recomiendo? (opcional)"
        rows={2}
        className={cn(
          "mt-2 w-full resize-none rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5",
          "text-[12px] leading-snug text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/30",
        )}
      />
    </li>
  );
}

function EmptyLook() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
        <SparkleIcon className="size-5" />
      </div>
      <p className="font-heading text-sm text-foreground">Tablero vacío</p>
      <p className="text-[12px] leading-snug text-muted-foreground">
        Toca productos del catálogo para armar la recomendación.
      </p>
    </div>
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

function SparkleIcon({ className }: { className?: string }) {
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
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  );
}
