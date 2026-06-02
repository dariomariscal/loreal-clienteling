import { cn } from "@/lib/utils";
import { stockTone, stockLabel } from "./scan-vocabulary";
import type { ScanLookupResult } from "@loreal/contracts";

interface ScanStockChipsProps {
  stock: ScanLookupResult["stock"];
  className?: string;
}

/**
 * Three-chip row that summarizes availability across the BA's accessible
 * stores: aquí · cercanas · México. Each chip carries a colored dot whose
 * tone is decided by `stockTone()` — the colors aren't picked here.
 *
 * Hidden chips would mislead more than help — when `thisStore` is null
 * (admin/area_manager without an assigned store) we render the row anyway
 * with a neutral pill so the BA never wonders if the data is loading.
 */
export function ScanStockChips({ stock, className }: ScanStockChipsProps) {
  const here = stock.thisStore?.available ?? 0;
  const nearby = stock.nearbyStores.reduce(
    (acc, s) => acc + s.available,
    0,
  );
  const national = stock.nationalAvailable;

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
      aria-label="Disponibilidad"
    >
      <StockChip scope="here" available={here} />
      <StockChip scope="nearby" available={nearby} />
      <StockChip scope="national" available={national} />
    </ul>
  );
}

const TONE_DOT_CLASSES = {
  stock: "bg-success",
  urgent: "bg-warning",
  neutral: "bg-muted-foreground/60",
  primary: "bg-foreground",
  relational: "bg-[color:var(--ba-accent)]",
  ai: "bg-[color:var(--ba-accent)]",
} as const;

function StockChip({
  scope,
  available,
}: {
  scope: "here" | "nearby" | "national";
  available: number;
}) {
  const tone = stockTone(available);
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", TONE_DOT_CLASSES[tone])}
      />
      <span className="tabular-nums">{stockLabel(available, scope)}</span>
    </li>
  );
}
