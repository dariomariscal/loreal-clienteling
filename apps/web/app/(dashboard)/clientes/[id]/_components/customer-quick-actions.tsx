"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  PurchaseGlyph,
  RecommendGlyph,
  AppointmentGlyph,
  NoteGlyph,
  MessageGlyph,
} from "@/components/ui/glyphs";

export type QuickActionId =
  | "purchase"
  | "recommend"
  | "appointment"
  | "note"
  | "message";

interface CustomerQuickActionsProps {
  onAction: (id: QuickActionId) => void;
  disabled?: boolean;
}

const ACTIONS: { id: QuickActionId; label: string; Glyph: React.ComponentType<{ className?: string }> }[] = [
  { id: "purchase", label: "Compra", Glyph: PurchaseGlyph },
  { id: "recommend", label: "Recomendar", Glyph: RecommendGlyph },
  { id: "appointment", label: "Cita", Glyph: AppointmentGlyph },
  { id: "note", label: "Nota", Glyph: NoteGlyph },
  { id: "message", label: "Mensaje", Glyph: MessageGlyph },
];

/**
 * Five primary actions, always reachable in one tap from the profile. The
 * row wraps on narrow iPads (768px portrait) into 3 + 2; every button stays
 * tap-target sized (≥40px).
 */
export function CustomerQuickActions({
  onAction,
  disabled,
}: CustomerQuickActionsProps) {
  return (
    <nav
      aria-label="Acciones rápidas"
      className="flex flex-wrap gap-2"
    >
      {ACTIONS.map(({ id, label, Glyph }) => (
        <Button
          key={id}
          variant="outline"
          size="default"
          disabled={disabled}
          onClick={() => onAction(id)}
          className="flex-1 min-w-[120px] justify-center gap-2"
        >
          <Glyph className="size-4" />
          {label}
        </Button>
      ))}
    </nav>
  );
}
