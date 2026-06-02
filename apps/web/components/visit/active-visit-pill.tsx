"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useActiveVisit } from "@/lib/hooks/use-customer-visits";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { CloseGlyph } from "@/components/ui/glyphs";
import { formatVisitDuration } from "@/components/advisor/visit-vocabulary";
import { CloseVisitSheet } from "./close-visit-sheet";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
}

/**
 * Persistent floating pill that surfaces the BA's current in-progress visit
 * across every advisor route. Tap → jumps to the customer profile. The "X"
 * opens the CloseVisitSheet directly, since closing the visit is the single
 * action the BA wants to perform from anywhere.
 *
 * Hidden on auth and counter-floor screens — those have their own context for
 * the active visit.
 */
export function ActiveVisitPill({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: visit } = useActiveVisit(user.id);
  const [closeOpen, setCloseOpen] = React.useState(false);

  // Force the duration label to refresh roughly every minute. We avoid a
  // setInterval ticker that re-renders the whole tree — bumping a counter
  // is enough because `formatVisitDuration` reads `new Date()` at render time.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!visit) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [visit]);

  if (!visit || !visit.customer) return null;

  // Hide on the very profile the pill points to — the ActiveContextSection
  // already surfaces the same affordance there, and a duplicated CTA would
  // crowd the customer 360.
  const customerPath = `/advisor/customers/${visit.customer.id}`;
  if (pathname?.startsWith(customerPath)) return null;

  const fullName = `${visit.customer.firstName} ${visit.customer.lastName}`.trim();
  const elapsed = formatVisitDuration(visit.startedAt);

  return (
    <>
      <div
        className={cn(
          // Bottom-center on phones, bottom-right on iPad+. Pointer-events-none
          // on the wrapper keeps drawers above us interactable.
          "pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:justify-end",
        )}
      >
        <div
          role="status"
          aria-label={`Visita en curso con ${fullName}, lleva ${elapsed}`}
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-full border border-[color:var(--ba-accent)]/40 bg-[color:var(--ba-accent)] py-1.5 pl-2 pr-1.5 text-[color:var(--ba-accent-foreground)] shadow-lg shadow-black/10",
          )}
        >
          <span
            aria-hidden
            className="relative flex size-2 items-center justify-center"
          >
            <span className="absolute inline-flex size-3 animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-current" />
          </span>

          <button
            type="button"
            onClick={() => router.push(customerPath)}
            className="flex items-center gap-2 pr-1 text-left"
          >
            <CustomerAvatar
              firstName={visit.customer.firstName}
              lastName={visit.customer.lastName}
              size="sm"
              className="size-7"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-medium">{fullName}</span>
              <span className="text-[11px] opacity-80 tabular-nums">
                {elapsed}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCloseOpen(true)}
            aria-label="Cerrar visita"
            className="flex size-9 items-center justify-center rounded-full bg-[color:var(--ba-accent-foreground)]/15 transition-colors hover:bg-[color:var(--ba-accent-foreground)]/25"
          >
            <CloseGlyph className="size-4" />
          </button>
        </div>
      </div>

      <CloseVisitSheet
        open={closeOpen}
        onOpenChange={setCloseOpen}
        visit={visit}
      />
    </>
  );
}
