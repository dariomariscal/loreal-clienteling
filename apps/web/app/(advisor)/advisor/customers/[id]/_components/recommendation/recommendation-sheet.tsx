"use client";

import * as React from "react";
import { useCreateRecommendation } from "@/lib/hooks";
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
import { ProductPicker } from "@/components/admin/product-picker";
import { cn } from "@/lib/utils";
import { VISIT_REASONS } from "./constants";
import { useLookDraft } from "./use-look-draft";
import { LookLine, EmptyLook } from "./look-line";

// Recommendation composer — Look Builder.
// Left: visual product catalog (reused from purchase flow).
// Right: "Recomendaciones de hoy" — each product is a row with a per-product
// reason textarea. Visit reason is a single picker at the top because it
// applies to the whole consultation (Sephora pattern).

interface RecommendationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function RecommendationSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: RecommendationSheetProps) {
  const {
    lines,
    reset,
    toggleProduct,
    updateNotes,
    removeLine,
    selectedIds,
  } = useLookDraft();
  const [visitPurpose, setVisitPurpose] = React.useState<string | null>(null);
  const [submitState, setSubmitState] = React.useState<
    "idle" | "submitting" | "error"
  >("idle");

  const createRec = useCreateRecommendation();

  React.useEffect(() => {
    if (open) {
      reset();
      setVisitPurpose(null);
      setSubmitState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleConfirm() {
    if (lines.length === 0 || submitState === "submitting") return;
    setSubmitState("submitting");

    // API takes one product per call, so fan out in parallel. Batch succeeds
    // only if all calls succeed; partial failures surface as a single error
    // and the BA can retry or remove offenders.
    try {
      await Promise.all(
        lines.map((l) =>
          createRec.mutateAsync({
            customerId,
            productId: l.product.id,
            source: "manual",
            ...(visitPurpose ? { visitPurpose } : {}),
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
        className="max-w-[min(96vw,1180px)]! sm:max-w-[min(96vw,1180px)]!"
      >
        <SheetHeader>
          <SheetTitle>Recomendar productos</SheetTitle>
          <SheetDescription>
            Para <span className="text-foreground">{customerName}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[1.45fr_1fr]">
          <div className="flex min-h-0 flex-col gap-4 border-r border-border/40 p-5">
            <ProductPicker
              onSelect={toggleProduct}
              selectedIds={selectedIds}
              multi
              gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
            />
          </div>

          <div className="flex min-h-0 flex-col bg-muted/20">
            <div className="space-y-3 border-b border-border/40 px-5 py-4">
              <div className="flex items-baseline justify-between">
                <p className="font-heading text-base text-foreground">
                  Recomendaciones de hoy
                </p>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {lines.length === 0
                    ? "Sin productos"
                    : lines.length === 1
                      ? "1 producto"
                      : `${lines.length} productos`}
                </span>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Motivo de visita
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VISIT_REASONS.map((r) => {
                    const active = visitPurpose === r.value;
                    const Glyph = r.Glyph;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() =>
                          setVisitPurpose(active ? null : r.value)
                        }
                        disabled={isSubmitting}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        <Glyph className="size-3" />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

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
                  className="flex-2"
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
