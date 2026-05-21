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
import { ProductPicker } from "@/components/dashboard/product-picker";
import { cn } from "@/lib/utils";

// ── Shade picker — Sephora ColorIQ "by product" pattern ────────────
// Three small steps: category → product → swatch.
// We honor the product's shadeOptions when present (array of strings or
// {code, hex} objects); otherwise fall back to a free-text input so the
// BA isn't blocked.

interface ShadeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

const CATEGORIES = [
  { value: "foundation", label: "Base", emoji: "🧴" },
  { value: "concealer", label: "Corrector", emoji: "✏️" },
  { value: "lipstick", label: "Labial", emoji: "💋" },
  { value: "blush", label: "Rubor", emoji: "🌸" },
] as const;

type Step = "category" | "product" | "shade";

interface ShadeOption {
  code: string;
  hex?: string;
}

export function ShadeSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: ShadeSheetProps) {
  const [step, setStep] = React.useState<Step>("category");
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

          {/* Breadcrumb of selections */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <StepCrumb
              active={step === "category"}
              done={!!category}
              label={categoryMeta?.label ?? "Categoría"}
              onClick={() => setStep("category")}
            />
            <CrumbSep />
            <StepCrumb
              active={step === "product"}
              done={!!product}
              label={product?.name ?? "Producto"}
              onClick={() => category && setStep("product")}
              disabled={!category}
            />
            <CrumbSep />
            <StepCrumb
              active={step === "shade"}
              done={!!finalCode}
              label={finalCode || "Tono"}
              onClick={() => product && setStep("shade")}
              disabled={!product}
            />
          </div>
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

        {/* Footer */}
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

// ── Steps ─────────────────────────────────────────────────────────

function CategoryStep({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl tracking-tight text-foreground">
        ¿Qué categoría?
      </h3>
      <ul className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => {
          const active = value === c.value;
          return (
            <li key={c.value}>
              <button
                type="button"
                onClick={() => onPick(c.value)}
                className={cn(
                  "flex w-full flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition-all duration-200",
                  active
                    ? "border-foreground shadow-sm"
                    : "border-border/60 hover:border-foreground/30",
                )}
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-xl"
                  aria-hidden
                >
                  {c.emoji}
                </span>
                <p className="font-heading text-[14px] text-foreground">
                  {c.label}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProductStep({
  category,
  selectedId,
  onPick,
}: {
  category: string;
  selectedId?: string;
  onPick: (p: Product) => void;
}) {
  // ProductPicker filters by its own category chips, but pre-narrowing
  // here keeps the BA on the right shelf without an extra tap. We pass
  // search/category through by using a stable wrapper.
  return (
    <div className="flex h-full min-h-[420px] flex-col gap-3">
      <h3 className="font-heading text-xl tracking-tight text-foreground">
        Elige el producto
      </h3>
      <p className="text-[12px] text-muted-foreground">
        Filtrado por categoría:{" "}
        <span className="text-foreground">
          {CATEGORIES.find((c) => c.value === category)?.label ?? category}
        </span>
      </p>
      <div className="min-h-0 flex-1">
        <ProductPicker
          onSelect={onPick}
          selectedIds={selectedId ? new Set([selectedId]) : undefined}
          gridClassName="grid-cols-2 sm:grid-cols-3"
        />
      </div>
    </div>
  );
}

function ShadeStep({
  product,
  shadeCode,
  customCode,
  onPickSwatch,
  onCustomChange,
}: {
  product: Product;
  shadeCode: string;
  customCode: string;
  onPickSwatch: (code: string) => void;
  onCustomChange: (v: string) => void;
}) {
  const options = parseShadeOptions(product.shadeOptions);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-heading text-xl tracking-tight text-foreground">
          ¿Qué tono?
        </h3>
        <p className="text-[12px] text-muted-foreground">
          {product.brand?.displayName ? `${product.brand.displayName} · ` : ""}
          {product.name}
        </p>
      </div>

      {options.length > 0 ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Tonos disponibles
          </p>
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {options.map((o) => {
              const active = shadeCode === o.code;
              return (
                <li key={o.code}>
                  <button
                    type="button"
                    onClick={() => onPickSwatch(o.code)}
                    className={cn(
                      "group flex w-full flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-150",
                      active
                        ? "border-foreground shadow-sm"
                        : "border-border/40 hover:border-foreground/30",
                    )}
                  >
                    <span
                      className={cn(
                        "size-10 rounded-full ring-2 transition-all",
                        active ? "ring-foreground" : "ring-transparent",
                        !o.hex && "bg-muted",
                      )}
                      style={o.hex ? { backgroundColor: o.hex } : undefined}
                      aria-hidden
                    />
                    <span className="text-[10px] font-medium tabular-nums text-foreground">
                      {o.code}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {options.length > 0 ? "O escribe otro código" : "Código del tono"}
        </p>
        <input
          type="text"
          value={customCode}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="N°2 Lys Rosé"
          maxLength={50}
          className={cn(
            "h-10 w-full rounded-xl border border-border bg-transparent px-3.5 text-sm outline-none transition-colors",
            "placeholder:text-muted-foreground/50",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          )}
        />
      </div>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────

function StepCrumb({
  active,
  done,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  done: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "max-w-[160px] truncate rounded-full px-2 py-0.5 transition-colors",
        active && "bg-foreground text-background",
        !active && done && "text-foreground hover:bg-muted",
        !active && !done && "text-muted-foreground/70",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}

function CrumbSep() {
  return <span className="text-muted-foreground/40">›</span>;
}

// Backend stores shadeOptions as a flexible JSON. We accept two shapes:
//   { shades: ["N1", "N2"] }                       → swatches sin color
//   { shades: [{ code: "N1", hex: "#E2BC9A" }] }   → swatches con color
// Anything else falls back to an empty list so the free-text input takes over.
function parseShadeOptions(raw: unknown): ShadeOption[] {
  if (!raw || typeof raw !== "object") return [];
  const shades = (raw as Record<string, unknown>).shades;
  if (!Array.isArray(shades)) return [];
  return shades
    .map((s) => {
      if (typeof s === "string") return { code: s };
      if (s && typeof s === "object") {
        const code = (s as Record<string, unknown>).code;
        const hex = (s as Record<string, unknown>).hex;
        if (typeof code === "string") {
          return { code, hex: typeof hex === "string" ? hex : undefined };
        }
      }
      return null;
    })
    .filter((s): s is ShadeOption => !!s);
}
