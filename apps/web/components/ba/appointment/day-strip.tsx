"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { AvailabilityDay } from "@loreal/contracts";

interface DayStripProps {
  fromIso: string;
  count: number;
  availability: AvailabilityDay[];
  selectedIso: string | null;
  onSelect: (iso: string) => void;
  isLoading?: boolean;
}

interface DayInfo {
  iso: string;
  date: Date;
  available: boolean;
}

// VISUAL DEVICE: horizontal strip of 48×56 chips.
//
// Cada chip lleva el weekday en eyebrow uppercase + número grande
// monoespaciado. Los días sin availability caen a opacity 40% y no
// son clicables. Selección: fondo accent-soft + borde accent.
// No card chrome, no shadow — la fila es un instrumento de scroll
// minimalista (patrón Calendly / Cal.com).
export function DayStrip({
  fromIso,
  count,
  availability,
  selectedIso,
  onSelect,
  isLoading,
}: DayStripProps) {
  const days = React.useMemo(
    () => buildDays(fromIso, count, availability),
    [fromIso, count, availability],
  );

  if (isLoading) {
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-14 w-12 shrink-0 animate-pulse rounded-lg bg-muted/30"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {days.map((d) => {
        const isSelected = d.iso === selectedIso;
        const isToday = isSameDay(d.date, new Date());
        return (
          <button
            key={d.iso}
            type="button"
            onClick={() => d.available && onSelect(d.iso)}
            disabled={!d.available}
            aria-pressed={isSelected}
            className={cn(
              "flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors",
              isSelected
                ? "border-[var(--ba-accent)]/40 bg-[var(--ba-accent-soft)]/60"
                : "border-border/40 bg-card hover:border-foreground/15",
              !d.available && "cursor-not-allowed opacity-40 hover:border-border/40",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-[0.08em]",
                isSelected ? "text-[var(--ba-accent)]" : "text-muted-foreground",
              )}
            >
              {formatWeekday(d.date)}
            </span>
            <span
              className={cn(
                "font-mono text-[15px] tabular-nums leading-none",
                isSelected ? "text-foreground" : "text-foreground",
              )}
              style={{ fontWeight: 540 }}
            >
              {d.date.getDate()}
            </span>
            {isToday && !isSelected ? (
              <span
                aria-hidden
                className="mt-0.5 size-1 rounded-full bg-[var(--ba-accent)]"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function buildDays(
  fromIso: string,
  count: number,
  availability: AvailabilityDay[],
): DayInfo[] {
  const availMap = new Map(
    availability.map((d) => [d.date, d.hasAvailability]),
  );
  const [y, m, d] = fromIso.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(base, i);
    const iso = toISODate(date);
    return {
      iso,
      date,
      available: availMap.get(iso) ?? true,
    };
  });
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekday(d: Date): string {
  return d
    .toLocaleDateString("es-MX", { weekday: "short" })
    .replace(".", "")
    .slice(0, 3);
}
