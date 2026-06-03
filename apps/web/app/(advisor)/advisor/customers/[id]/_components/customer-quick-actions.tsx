"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AppointmentGlyph,
  BarcodeGlyph,
  MessageGlyph,
  NoteGlyph,
  PurchaseGlyph,
  RecommendGlyph,
  VisitGlyph,
} from "@/components/ui/glyphs";
import {
  useActiveVisit,
  useStartCustomerVisit,
} from "@/lib/hooks/use-customer-visits";
import type { Customer } from "@/lib/hooks/use-customers";
import { useCustomerCart } from "./order/cart-context";

// One "message" entry covers WhatsApp / email / SMS — the MessageSheet
// has channel tabs inside, so surfacing each channel as its own button
// was redundant and crowded the action row.
//
// "visit" is a verb action (start), not a sheet — when tapped we POST the
// visit and let the ActiveVisitPill + ActiveContextSection take over the UI.
export type CustomerQuickActionId =
  | "visit"
  | "scan"
  | "message"
  | "appointment"
  | "note"
  | "recommend"
  | "purchase";

interface Props {
  customer: Customer;
  onAction: (id: Exclude<CustomerQuickActionId, "visit">) => void;
}

interface ActionDef {
  id: Exclude<CustomerQuickActionId, "visit">;
  label: string;
  Glyph: React.ComponentType<{ className?: string }>;
  isAvailable: (c: Customer) => boolean;
}

const ACTIONS: ActionDef[] = [
  {
    id: "message",
    label: "Mensaje",
    Glyph: MessageGlyph,
    isAvailable: (c) => Boolean(c.phone || c.email),
  },
  { id: "appointment", label: "Cita", Glyph: AppointmentGlyph, isAvailable: () => true },
  { id: "recommend", label: "Sugerir", Glyph: RecommendGlyph, isAvailable: () => true },
  { id: "purchase", label: "Compra", Glyph: PurchaseGlyph, isAvailable: () => true },
  { id: "note", label: "Nota", Glyph: NoteGlyph, isAvailable: () => true },
];

/**
 * Inline quick-actions for the profile header. Icon-only with a native tooltip
 * (title) so the entire action row fits on the right side of the sticky bar
 * without forcing wrap on iPad landscape.
 *
 * "Iniciar visita" is leftmost and accent-tinted — it's the BA's first move
 * when a customer walks up to the counter. Once a visit is open for this
 * customer the button hides; ActiveContextSection takes over with the
 * "Cerrar visita" affordance.
 */
export function CustomerQuickActions({ customer, onAction }: Props) {
  const visible = ACTIONS.filter((a) => a.isAvailable(customer));
  const { itemCount } = useCustomerCart();

  return (
    <nav aria-label="Acciones rápidas" className="flex items-center gap-1">
      <StartVisitButton customer={customer} />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAction("scan")}
        title="Escáner"
        aria-label="Escáner"
        className="size-10"
      >
        <BarcodeGlyph className="size-4" />
      </Button>
      {visible.map(({ id, label, Glyph }) => {
        const showCartBadge = id === "purchase" && itemCount > 0;
        const ariaLabel = showCartBadge
          ? `${label} (${itemCount} en carrito)`
          : label;
        return (
          <Button
            key={id}
            variant="ghost"
            size="icon"
            onClick={() => onAction(id)}
            title={ariaLabel}
            aria-label={ariaLabel}
            className="relative size-10"
          >
            <Glyph className="size-4" />
            {showCartBadge ? (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--ba-accent)] px-1 text-[10px] font-semibold leading-none text-[color:var(--ba-accent-foreground)]"
              >
                {itemCount}
              </span>
            ) : null}
          </Button>
        );
      })}
    </nav>
  );
}

/**
 * Internal button isolated so we can scope the `useAuth` + active-visit query
 * to it without leaking that dependency to every other action.
 */
function StartVisitButton({ customer }: { customer: Customer }) {
  const { userId } = useAuth();
  const { data: activeVisit, isLoading } = useActiveVisit(userId ?? undefined);
  const startVisit = useStartCustomerVisit();

  // Hide while we don't know yet — we'd rather miss one frame than show the
  // button, have the BA tap, and create a phantom visit while another was
  // already open with a different customer.
  if (isLoading) return null;

  // Already in this customer's visit → no duplicate start.
  if (activeVisit && activeVisit.customerId === customer.id) return null;

  // In a visit with someone else → keep the button shown but disabled with a
  // tooltip that points to the active session, so the BA never wonders why
  // tapping does nothing.
  const inOtherVisit = Boolean(
    activeVisit && activeVisit.customerId !== customer.id,
  );

  function handleClick() {
    if (inOtherVisit || startVisit.isPending) return;
    startVisit.mutate({ customerId: customer.id });
  }

  const label = inOtherVisit
    ? "Termina la visita en curso para empezar otra"
    : "Iniciar visita";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={inOtherVisit || startVisit.isPending}
      title={label}
      aria-label={label}
      className={cn(
        "size-10 text-[color:var(--ba-accent)]",
        inOtherVisit && "opacity-40",
      )}
    >
      <VisitGlyph className="size-4" />
    </Button>
  );
}
