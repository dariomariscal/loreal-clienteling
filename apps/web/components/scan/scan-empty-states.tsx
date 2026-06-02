"use client";

import { Button } from "@/components/ui/button";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import {
  BarcodeGlyph,
  AlertCircleGlyph,
  SearchGlyph,
} from "@/components/ui/glyphs";

interface ScanNotFoundStateProps {
  /** The barcode that failed to resolve — echoed back so the BA knows what they scanned. */
  barcode?: string;
  onEnterManually: () => void;
  onOpenCatalog: () => void;
}

/**
 * Shown inside the bottom sheet when `GET /products/lookup` returns 404.
 * Mirrors the Scandit UX guidance: the scanner should feel forgiving, not
 * punitive — no red, no error iconography, just a recovery path.
 */
export function ScanNotFoundState({
  barcode,
  onEnterManually,
  onOpenCatalog,
}: ScanNotFoundStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
      <AdvisorEmptyState
        icon={<BarcodeGlyph className="size-7" />}
        title="No encontramos este SKU"
        description={
          barcode
            ? `El código ${barcode} no coincide con ningún producto en tu catálogo.`
            : "Intenta de nuevo o escribe el SKU manualmente."
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="default" size="sm" onClick={onEnterManually}>
          Escribir SKU
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenCatalog}>
          <SearchGlyph className="size-4" />
          Buscar en catálogo
        </Button>
      </div>
    </div>
  );
}

interface ScanOutOfScopeStateProps {
  brandName: string;
  onDismiss: () => void;
}

/**
 * The variant exists but belongs to a brand outside the BA's accessible
 * scope (e.g. a Lancôme advisor scans a YSL tester). Friendly amber tone,
 * no red — the BA didn't do anything wrong.
 */
export function ScanOutOfScopeState({
  brandName,
  onDismiss,
}: ScanOutOfScopeStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-warning/12 text-warning">
        <AlertCircleGlyph className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-[family-name:var(--font-heading)] text-sm text-foreground">
          Este producto es de {brandName}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Fuera del catálogo que manejas en este mostrador. Pídele a una
          asesora de {brandName} que lo registre.
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        Entendido
      </Button>
    </div>
  );
}
