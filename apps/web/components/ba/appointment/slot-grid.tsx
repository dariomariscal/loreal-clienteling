"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@loreal/contracts";

interface SlotGridProps {
  slots: AvailabilitySlot[];
  selectedStartsAt: string | null;
  onSelect: (startsAt: string) => void;
  isLoading?: boolean;
}

// VISUAL DEVICE: 4-column grid of 36px time chips.
//
// Cada chip muestra la hora en font-mono tabular-nums. Selección:
// fondo accent (terracota), texto accent-foreground. Hover: borde
// foreground sutil. No card chrome, no shadow — un instrumento de
// pick-and-confirm rápido, como Cal.com público.
export function SlotGrid({
  slots,
  selectedStartsAt,
  onSelect,
  isLoading,
}: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-muted/30" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-center">
        <p className="text-[12.5px] text-muted-foreground">
          No hay horarios libres este día. Prueba otro.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {slots.map((slot) => {
        const isSelected = slot.startsAt === selectedStartsAt;
        return (
          <button
            key={slot.startsAt}
            type="button"
            onClick={() => onSelect(slot.startsAt)}
            aria-pressed={isSelected}
            className={cn(
              "flex h-9 items-center justify-center rounded-md border font-mono text-[13px] tabular-nums transition-colors",
              isSelected
                ? "border-[var(--ba-accent)] bg-[var(--ba-accent)] text-[var(--ba-accent-foreground)]"
                : "border-border/50 bg-card text-foreground hover:border-foreground/25",
            )}
          >
            {formatTime(slot.startsAt)}
          </button>
        );
      })}
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
