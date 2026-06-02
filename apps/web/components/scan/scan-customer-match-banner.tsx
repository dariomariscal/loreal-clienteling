import { cn } from "@/lib/utils";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import {
  CheckCircleGlyph,
  FollowupReplenishmentGlyph,
  HeartGlyph,
  PackageGlyph,
} from "@/components/ui/glyphs";

/**
 * Signals the scan endpoint can compute about an active customer. Each one
 * upgrades the bottom-sheet visual from a flat product card to a context-aware
 * recall — the difference between "here's a product" and "here's HER product".
 *
 * Order matters: `historicalShade` > `replenishmentDue` > `inWishlist` >
 * `sampleGivenBefore`. The banner only ever renders the strongest signal.
 */
export type ScanMatchSignal =
  | "historical_shade"
  | "replenishment_due"
  | "in_wishlist"
  | "sample_given";

interface ScanCustomerMatchBannerProps {
  customer: { firstName: string; lastName?: string | null; avatarUrl?: string | null };
  signal: ScanMatchSignal;
  /**
   * Days since the last purchase of this exact variant. Drives the secondary
   * line under the headline ("hace 6 meses · recompra esperada").
   */
  daysSinceLastPurchase?: number | null;
  className?: string;
}

interface SignalVisual {
  headline: (firstName: string) => string;
  detail: (days: number | null | undefined) => string;
  Icon: (props: { className?: string }) => React.JSX.Element;
  tone: "stock" | "urgent" | "relational" | "neutral";
}

const SIGNAL_VISUAL: Record<ScanMatchSignal, SignalVisual> = {
  historical_shade: {
    headline: (first) => `Es el shade oficial de ${first}`,
    detail: (days) =>
      typeof days === "number" && days > 0
        ? `Última compra hace ${days} días`
        : "Coincide con su shade registrado",
    Icon: CheckCircleGlyph,
    tone: "stock",
  },
  replenishment_due: {
    headline: (first) => `${first} debe estar por terminarlo`,
    detail: (days) =>
      typeof days === "number"
        ? `${days} días desde la última compra`
        : "Tiempo de recompra alcanzado",
    Icon: FollowupReplenishmentGlyph,
    tone: "urgent",
  },
  in_wishlist: {
    headline: (first) => `Está en la wishlist de ${first}`,
    detail: () => "Agregado previamente desde otra sesión",
    Icon: HeartGlyph,
    tone: "relational",
  },
  sample_given: {
    headline: (first) => `Ya le entregaste muestra a ${first}`,
    detail: () => "Buen momento para confirmar conversión",
    Icon: PackageGlyph,
    tone: "neutral",
  },
};

const TONE_CLASSES: Record<SignalVisual["tone"], string> = {
  stock: "bg-success/12 text-success",
  urgent: "bg-warning/12 text-warning",
  relational: "bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * Banner rendered directly under the product hero in the scan sheet. The
 * avatar reinforces the binding to the active customer — Salesfloor's beauty
 * clienteling pattern, lightened. We deliberately render at most one banner
 * per scan; layering signals creates noise and dilutes the BA's read.
 */
export function ScanCustomerMatchBanner({
  customer,
  signal,
  daysSinceLastPurchase,
  className,
}: ScanCustomerMatchBannerProps) {
  const visual = SIGNAL_VISUAL[signal];
  const headline = visual.headline(customer.firstName);
  const detail = visual.detail(daysSinceLastPurchase);
  const Icon = visual.Icon;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5",
        TONE_CLASSES[visual.tone],
        className,
      )}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <CustomerAvatar
          firstName={customer.firstName}
          lastName={customer.lastName}
          avatarUrl={customer.avatarUrl}
          size="sm"
          className="ring-2 ring-background"
        />
        <span className="absolute -right-0.5 -bottom-0.5 inline-flex size-4 items-center justify-center rounded-full bg-background text-current">
          <Icon className="size-3" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-current">
          {headline}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-current/80">
          {detail}
        </p>
      </div>
    </div>
  );
}

/**
 * Pure-logic helper: pick the single strongest signal to show, given the
 * payload returned by `GET /products/lookup`. Lives next to the banner so
 * the priority rule is one read away.
 */
export function pickScanMatchSignal(match: {
  isHistoricalShade: boolean;
  replenishmentDue: boolean;
  inWishlist: boolean;
  sampleGivenBefore: boolean;
}): ScanMatchSignal | null {
  if (match.isHistoricalShade) return "historical_shade";
  if (match.replenishmentDue) return "replenishment_due";
  if (match.inWishlist) return "in_wishlist";
  if (match.sampleGivenBefore) return "sample_given";
  return null;
}
