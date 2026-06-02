import { cn } from "@/lib/utils";

interface Props {
  /** Days until predicted depletion. Negative = already overdue. */
  daysUntilDepletion: number;
  className?: string;
}

/**
 * Inline timeline that visualises the predicted depletion window from the
 * engine. Reads left-to-right: where the customer was, where she is today,
 * where the engine predicts she'll run out.
 *
 * The "today" marker is anchored at 50% and the "predicted" marker is offset
 * proportionally to `daysUntilDepletion` clamped to a sensible window so a
 * 90-day prediction doesn't collapse the bar.
 */
const WINDOW_DAYS = 30;

export function ReplenishmentTimeline({ daysUntilDepletion, className }: Props) {
  const clampedDays = Math.max(
    -WINDOW_DAYS,
    Math.min(WINDOW_DAYS, daysUntilDepletion),
  );
  const predictedLeftPct = 50 + (clampedDays / (WINDOW_DAYS * 2)) * 100;
  const isOverdue = daysUntilDepletion <= 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative h-1.5 rounded-full bg-border/60">
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
        />
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-card",
            isOverdue ? "bg-destructive" : "bg-warning",
          )}
          style={{ left: `${predictedLeftPct}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Última compra</span>
        <span className="text-foreground">Hoy</span>
        <span className={cn(isOverdue && "text-destructive")}>
          {isOverdue
            ? `Vencido hace ${Math.abs(daysUntilDepletion)}d`
            : `Se acaba en ${daysUntilDepletion}d`}
        </span>
      </div>
    </div>
  );
}
