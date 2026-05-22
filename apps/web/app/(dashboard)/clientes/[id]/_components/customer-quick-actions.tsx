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
import { can, type Permission } from "@/lib/permissions";

export type QuickActionId =
  | "purchase"
  | "recommend"
  | "appointment"
  | "note"
  | "message";

interface CustomerQuickActionsProps {
  role: string;
  onAction: (id: QuickActionId) => void;
  disabled?: boolean;
}

const ACTIONS: {
  id: QuickActionId;
  label: string;
  Glyph: React.ComponentType<{ className?: string }>;
  permission: Permission;
}[] = [
  { id: "purchase", label: "Compra", Glyph: PurchaseGlyph, permission: "purchase.create" },
  { id: "recommend", label: "Recomendar", Glyph: RecommendGlyph, permission: "recommendation.create" },
  { id: "appointment", label: "Cita", Glyph: AppointmentGlyph, permission: "appointment.create" },
  { id: "note", label: "Nota", Glyph: NoteGlyph, permission: "note.create" },
  { id: "message", label: "Mensaje", Glyph: MessageGlyph, permission: "communication.create" },
];

/**
 * Primary actions, reachable in one tap from the profile. Filtered by role —
 * non-BA viewers (admin/manager/supervisor) see no actions and the row hides.
 */
export function CustomerQuickActions({
  role,
  onAction,
  disabled,
}: CustomerQuickActionsProps) {
  const visible = ACTIONS.filter((a) => can(role, a.permission));
  if (visible.length === 0) return null;

  return (
    <nav
      aria-label="Acciones rápidas"
      className="flex flex-wrap gap-2"
    >
      {visible.map(({ id, label, Glyph }) => (
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
