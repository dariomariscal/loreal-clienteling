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
 */
export function CustomerQuickActions({ customer, onAction }: Props) {
  const visible = ACTIONS.filter((a) => a.isAvailable(customer));

  return (
    <nav aria-label="Acciones rápidas" className="flex items-center gap-1">
      {visible.map(({ id, label, Glyph }) => (
        <Button
          key={id}
          variant="ghost"
          size="icon"
          onClick={() => onAction(id)}
          title={label}
          aria-label={label}
          className="size-10"
        >
          <Glyph className="size-4" />
        </Button>
      ))}
    </nav>
  );
}
