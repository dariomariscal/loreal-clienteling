"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AppointmentGlyph,
  MessageGlyph,
  NoteGlyph,
  PurchaseGlyph,
  RecommendGlyph,
} from "@/components/ui/glyphs";
import type { Customer } from "@/lib/hooks/use-customers";

// One "message" entry covers WhatsApp / email / SMS — the MessageSheet
// has channel tabs inside, so surfacing each channel as its own button
// was redundant and crowded the action row.
export type CustomerQuickActionId =
  | "message"
  | "appointment"
  | "note"
  | "recommend"
  | "purchase";

interface Props {
  customer: Customer;
  onAction: (id: CustomerQuickActionId) => void;
}

interface ActionDef {
  id: CustomerQuickActionId;
  label: string;
  Glyph: React.ComponentType<{ className?: string }>;
  /** Returns false when the customer's data doesn't support this action. */
  isAvailable: (c: Customer) => boolean;
}

const ACTIONS: ActionDef[] = [
  {
    id: "message",
    label: "Mensaje",
    Glyph: MessageGlyph,
    // The sheet's channel tabs let the BA pick WhatsApp/email/SMS once
    // open; we only hide the action if the clienta has neither phone
    // nor email — nothing reachable.
    isAvailable: (c) => Boolean(c.phone || c.email),
  },
  {
    id: "appointment",
    label: "Cita",
    Glyph: AppointmentGlyph,
    isAvailable: () => true,
  },
  {
    id: "recommend",
    label: "Sugerir",
    Glyph: RecommendGlyph,
    isAvailable: () => true,
  },
  {
    id: "purchase",
    label: "Compra",
    Glyph: PurchaseGlyph,
    isAvailable: () => true,
  },
  {
    id: "note",
    label: "Nota",
    Glyph: NoteGlyph,
    isAvailable: () => true,
  },
];

/**
 * Primary actions reachable in one tap from the profile. iPad-sized: each
 * button has a 44pt touch target (h-12) and a meaningful minimum width so
 * landscape layouts don't squeeze them into illegible chips.
 */
export function CustomerQuickActions({ customer, onAction }: Props) {
  const visible = ACTIONS.filter((a) => a.isAvailable(customer));

  return (
    <nav
      aria-label="Acciones rápidas"
      className="flex flex-wrap gap-2"
    >
      {visible.map(({ id, label, Glyph }) => (
        <Button
          key={id}
          variant="outline"
          onClick={() => onAction(id)}
          className="h-12 min-w-[140px] flex-1 justify-center gap-2"
        >
          <Glyph className="size-4" />
          {label}
        </Button>
      ))}
    </nav>
  );
}
