"use client";

import * as React from "react";
import { useAddShade, type Product } from "@/lib/hooks";
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
import { CATEGORIES, parseShadeOptions, type StepKey } from "./constants";
import { StepBreadcrumb } from "./step-breadcrumb";
import { CategoryStep } from "./category-step";
import { ProductStep } from "./product-step";
import { ShadeStep } from "./shade-step";

// Shade picker — Sephora ColorIQ "by product" pattern.
// Three small steps: category → product → swatch.
// Honors the product's shadeOptions when present; otherwise falls back
// to a free-text input so the BA isn't blocked.

interface ShadeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function ShadeSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: ShadeSheetProps) {
  const [step, setStep] = React.useState<StepKey>("category");
  const [category, setCategory] = React.useState<string | null>(null);
  const [product, setProduct] = React.useState<Product | null>(null);
  const [shadeCode, setShadeCode] = React.useState("");
  const [customCode, setCustomCode] = React.useState("");

  const addShade = useAddShade();

  React.useEffect(() => {
    if (open) {
      setStep("category");
      setCategory(null);
      setProduct(null);
      setShadeCode("");
      setCustomCode("");
      addShade.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pickCategory(c: string) {
    setCategory(c);
    setStep("product");
  }

  function pickProduct(p: Product) {
    setProduct(p);
    const options = parseShadeOptions(p.shadeOptions);
    if (options.length === 0) setShadeCode("");
    setStep("shade");
  }

  function confirm() {
    if (!product || !category) return;
    const finalCode = (shadeCode || customCode).trim();
    if (!finalCode) return;
    addShade.mutate(
      {
        customerId,
        category,
        brandId: product.brandId,
        productId: product.id,
        shadeCode: finalCode,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  const categoryMeta = CATEGORIES.find((c) => c.value === category);
  const finalCode = (shadeCode || customCode).trim();
  const canConfirm =
    !!product && !!category && finalCode.length > 0 && !addShade.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Agregar tono</SheetTitle>
          <SheetDescription>
            Para <span className="text-foreground">{customerName}</span>
          </SheetDescription>

          <StepBreadcrumb
            steps={[
              {
                active: step === "category",
                done: !!category,
                label: categoryMeta?.label ?? "Categoría",
                onClick: () => setStep("category"),
              },
              {
                active: step === "product",
                done: !!product,
                label: product?.name ?? "Producto",
                onClick: () => category && setStep("product"),
                disabled: !category,
              },
              {
                active: step === "shade",
                done: !!finalCode,
                label: finalCode || "Tono",
                onClick: () => product && setStep("shade"),
                disabled: !product,
              },
            ]}
          />
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step === "category" && (
            <CategoryStep value={category} onPick={pickCategory} />
          )}

          {step === "product" && (
            <ProductStep
              category={category!}
              selectedId={product?.id}
              onPick={pickProduct}
            />
          )}

          {step === "shade" && product && (
            <ShadeStep
              product={product}
              shadeCode={shadeCode}
              customCode={customCode}
              onPickSwatch={(code) => {
                setShadeCode(code);
                setCustomCode("");
              }}
              onCustomChange={(v) => {
                setCustomCode(v);
                setShadeCode("");
              }}
            />
          )}
        </div>

        <div className="shrink-0 border-t border-border/40 bg-muted/30 px-6 py-4">
          {addShade.isError && (
            <Badge variant="destructive" className="mb-3 w-full justify-center">
              No se pudo guardar el tono. Intenta otra vez.
            </Badge>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (step === "shade") setStep("product");
                else if (step === "product") setStep("category");
              }}
              disabled={step === "category" || addShade.isPending}
            >
              Atrás
            </Button>
            <div className="flex items-center gap-2">
              <SheetClose>
                <Button variant="outline" disabled={addShade.isPending}>
                  Cancelar
                </Button>
              </SheetClose>
              {step === "shade" ? (
                <Button onClick={confirm} disabled={!canConfirm}>
                  {addShade.isPending ? "Guardando…" : "Guardar tono"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
