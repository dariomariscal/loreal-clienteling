"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/advisor/section-card";
import { useActiveVisit } from "@/lib/hooks/use-customer-visits";
import {
  bookedReasonLabel,
  formatVisitDuration,
} from "@/components/advisor/visit-vocabulary";
import { CloseVisitSheet } from "./close-visit-sheet";

interface Props {
  customerId: string;
}

/**
 * Section-card surfaced at the top of the customer profile when a visit is
 * in progress for this customer attended by the current BA. Mirrors the
 * editorial pattern of ActiveContextSection ("Lo que está pasando") so it
 * blends in instead of feeling bolted-on.
 *
 * Renders nothing when there's no active visit or when the active visit
 * belongs to a different customer.
 */
export function ActiveVisitCard({ customerId }: Props) {
  const { userId } = useAuth();
  const { data: visit } = useActiveVisit(userId ?? undefined);
  const [closeOpen, setCloseOpen] = React.useState(false);

  // Refresh the duration label about once a minute without re-rendering the
  // whole tree. Same approach as ActiveVisitPill.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!visit) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [visit]);

  if (!visit || visit.customerId !== customerId) return null;

  const elapsed = formatVisitDuration(visit.startedAt);
  const productCount = visit.productsViewed?.length ?? 0;
  const reasonHint = visit.bookedReason
    ? `Motivo: ${bookedReasonLabel(visit.bookedReason)}`
    : "Walk-in · sin cita previa";

  return (
    <>
      <SectionCard
        title="Visita en curso"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCloseOpen(true)}
          >
            Cerrar visita
          </Button>
        }
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <span
            aria-hidden
            className="relative flex size-2.5 items-center justify-center"
          >
            <span className="absolute inline-flex size-3.5 animate-ping rounded-full bg-[color:var(--ba-accent)] opacity-50" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[color:var(--ba-accent)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Empezó hace {elapsed}
            </p>
            <p className="text-xs text-muted-foreground">
              {reasonHint}
              {productCount > 0
                ? ` · ${productCount} ${productCount === 1 ? "producto" : "productos"} mostrados`
                : ""}
            </p>
          </div>
        </div>
      </SectionCard>

      <CloseVisitSheet
        open={closeOpen}
        onOpenChange={setCloseOpen}
        visit={visit}
      />
    </>
  );
}
