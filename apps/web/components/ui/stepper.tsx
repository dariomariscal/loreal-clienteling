"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MinusGlyph, PlusGlyph } from "@/components/ui/glyphs";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** Aria label for screen readers; defaults to "Cantidad". */
  label?: string;
}

/**
 * Quantity stepper — `[-]  n  [+]`. Spec §11.4: never use a free-form number
 * input when an increment control fits the use case; BAs working a touchpad
 * miss text targets but never miss a 32px tap zone.
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  disabled,
  className,
  label = "Cantidad",
}: StepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex h-9 items-center rounded-md border border-input bg-card",
        disabled && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Disminuir"
        className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:rounded-l-md"
      >
        <MinusGlyph className="size-4" />
      </button>

      <span
        aria-live="polite"
        className="flex min-w-8 items-center justify-center px-1 text-sm font-medium tabular-nums text-foreground"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Aumentar"
        className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:rounded-r-md"
      >
        <PlusGlyph className="size-4" />
      </button>
    </div>
  );
}
