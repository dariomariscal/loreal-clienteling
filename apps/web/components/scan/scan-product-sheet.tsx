"use client";

import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScanShadeWash, ScanSwatchDot } from "./scan-shade-wash";
import { ScanStockChips } from "./scan-stock-chips";
import {
  ScanCustomerMatchBanner,
  pickScanMatchSignal,
} from "./scan-customer-match-banner";
import { ScanActionRow } from "./scan-action-row";
import { ScanNotFoundState, ScanOutOfScopeState } from "./scan-empty-states";
import { PackageGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import type { ScanLookupResult, ScanActionType } from "@loreal/contracts";

/**
 * Bottom-sheet that renders a single scan's product card. Composes the
 * scan/* primitives — kept thin so any one piece (banner, chips, actions)
 * can evolve without touching the others. SRP applied at the sheet level:
 * this file owns layout + the open/close contract, nothing else.
 */
interface ScanProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lookup result for the most recent scan. Null while loading or unscanned. */
  result: ScanLookupResult | null;
  /**
   * The scanned barcode literal — surfaced inside the not-found state so the
   * BA sees the exact code that failed. Optional; the in-scope sheet doesn't
   * need it.
   */
  lastBarcode?: string;
  /** Customer attached to the scan session, if any. */
  activeCustomer?: {
    firstName: string;
    lastName?: string | null;
    avatarUrl?: string | null;
  } | null;
  /**
   * Resolution state. The lookup endpoint can fail in three meaningful ways
   * (404 / out-of-scope / unknown error) and the sheet renders a tailored
   * recovery for each. Plain "open with null result" is treated as loading.
   */
  status: "loading" | "ok" | "not_found" | "out_of_scope" | "error";
  /** Brand name surfaced inside the out-of-scope state. */
  outOfScopeBrand?: string;

  // ── Action handlers ────────────────────────────────────────────
  onAction: (action: ScanActionType) => void;
  onEnterBarcodeManually: () => void;
  onOpenCatalog: () => void;
  /** Whether an action mutation is in-flight; disables every action button. */
  actionPending?: boolean;
}

export function ScanProductSheet({
  open,
  onOpenChange,
  result,
  lastBarcode,
  activeCustomer,
  status,
  outOfScopeBrand,
  onAction,
  onEnterBarcodeManually,
  onOpenCatalog,
  actionPending,
}: ScanProductSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" size="lg" showCloseButton className="pb-6">
        {status === "loading" ? <ScanProductSheetSkeleton /> : null}

        {status === "not_found" ? (
          <ScanNotFoundState
            barcode={lastBarcode}
            onEnterManually={onEnterBarcodeManually}
            onOpenCatalog={onOpenCatalog}
          />
        ) : null}

        {status === "out_of_scope" ? (
          <ScanOutOfScopeState
            brandName={outOfScopeBrand ?? "otra marca"}
            onDismiss={() => onOpenChange(false)}
          />
        ) : null}

        {status === "error" ? (
          <div className="px-8 py-10 text-center text-sm text-muted-foreground">
            No pudimos resolver este código. Intenta de nuevo.
          </div>
        ) : null}

        {status === "ok" && result ? (
          <ScanProductSheetBody
            result={result}
            activeCustomer={activeCustomer}
            actionPending={actionPending}
            onAction={onAction}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ── Body ─────────────────────────────────────────────────────────

interface ScanProductSheetBodyProps {
  result: ScanLookupResult;
  activeCustomer?: ScanProductSheetProps["activeCustomer"];
  actionPending?: boolean;
  onAction: (action: ScanActionType) => void;
}

function ScanProductSheetBody({
  result,
  activeCustomer,
  actionPending,
  onAction,
}: ScanProductSheetBodyProps) {
  const { variant, product, stock, customerMatch, suggestedActions } = result;
  const primary = suggestedActions[0];
  const secondary = suggestedActions.slice(1);

  // Banner picks the strongest signal; null when no signal applies or no
  // customer is bound. Behavior is owned by the banner module, not here.
  const signal = customerMatch ? pickScanMatchSignal(customerMatch) : null;

  return (
    <>
      <SheetTitle className="sr-only">{product.title}</SheetTitle>
      <SheetDescription className="sr-only">
        {product.brand.displayName} — {variant.title}
      </SheetDescription>

      <ScanShadeWash swatchHex={variant.swatchHex}>
        <div className="grid grid-cols-[112px_1fr] gap-4 px-6 pt-6 pb-5">
          <ScanProductHeroImage
            imageUrl={variant.imageUrl}
            title={product.title}
          />
          <ScanProductIdentity result={result} />
        </div>
      </ScanShadeWash>

      <div className="space-y-4 px-6 pt-4">
        {signal && activeCustomer ? (
          <ScanCustomerMatchBanner
            customer={activeCustomer}
            signal={signal}
            daysSinceLastPurchase={customerMatch?.daysSinceLastPurchase}
          />
        ) : null}

        <ScanStockChips stock={stock} />

        {secondary.length > 0 ? (
          <ScanActionRow
            actions={secondary.map((a) => ({ type: a.type, label: a.label }))}
            disabled={actionPending}
            onSelect={onAction}
          />
        ) : null}
      </div>

      {primary ? (
        <div className="mt-5 px-6">
          <ScanPrimaryCta
            label={primary.label}
            actionType={primary.type}
            price={variant.price}
            reason={primary.reason}
            disabled={actionPending}
            onClick={() => onAction(primary.type)}
          />
        </div>
      ) : null}
    </>
  );
}

// ── Primitives ───────────────────────────────────────────────────

function ScanProductHeroImage({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  return (
    <div className="relative aspect-square w-28 overflow-hidden rounded-xl bg-background/40 ring-1 ring-foreground/5">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="112px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <PackageGlyph className="size-8" />
        </div>
      )}
    </div>
  );
}

function ScanProductIdentity({ result }: { result: ScanLookupResult }) {
  const { variant, product } = result;
  const optionLabel = variant.optionLabel;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/70">
        {product.brand.displayName}
      </p>
      <p className="font-[family-name:var(--font-heading)] text-base leading-tight tracking-tight text-foreground">
        {product.title}
      </p>
      {variant.swatchHex && optionLabel ? (
        <ScanSwatchDot
          swatchHex={variant.swatchHex}
          label={optionLabel}
          size="md"
          className="mt-1"
        />
      ) : optionLabel ? (
        <p className="text-xs text-muted-foreground">{optionLabel}</p>
      ) : null}
      <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
        {formatPriceMxn(variant.price)}
      </p>
    </div>
  );
}

interface ScanPrimaryCtaProps {
  label: string;
  actionType: ScanActionType;
  price: number;
  reason?: string;
  disabled?: boolean;
  onClick: () => void;
}

function ScanPrimaryCta({
  label,
  actionType,
  price,
  reason,
  disabled,
  onClick,
}: ScanPrimaryCtaProps) {
  // The CTA only echoes the price for cart-bound actions — echoing a price
  // on "Registrar muestra" or "Mostrado a cliente" would mislead.
  const showsPriceEcho = actionType === "add_to_cart" || actionType === "reserve";

  return (
    <div className="space-y-1.5">
      <Button
        size="lg"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "h-12 w-full justify-between bg-foreground px-5 text-background hover:bg-foreground/90",
          "text-[13px] font-medium uppercase tracking-[0.14em]",
        )}
      >
        <span>{label}</span>
        {showsPriceEcho ? (
          <span className="tabular-nums">{formatPriceMxn(price)}</span>
        ) : null}
      </Button>
      {reason ? (
        <p className="px-1 text-center text-[11px] text-muted-foreground">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

function ScanProductSheetSkeleton() {
  return (
    <div className="space-y-4 px-6 pt-6 pb-6">
      <div className="grid grid-cols-[112px_1fr] gap-4">
        <div className="aspect-square w-28 animate-pulse rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function formatPriceMxn(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
