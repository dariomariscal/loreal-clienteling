"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_OUTCOME_CODES,
  type AppointmentOutcomeCode,
} from "@loreal/contracts";
import {
  APPOINTMENT_OUTCOME_LABEL,
  APPOINTMENT_OUTCOME_HINT,
} from "@/lib/appointments/labels";

interface OutcomeRadioGroupProps {
  value: AppointmentOutcomeCode | null;
  onChange: (value: AppointmentOutcomeCode) => void;
  disabled?: boolean;
}

/**
 * Outcome picker for the check-out flow.
 *
 * Single responsibility: present the 5 outcome codes as a radio grid + emit
 * the chosen value. No mutation logic, no follow-up generation — those live
 * in the parent sheet.
 *
 * Industry naming: matches the "outcome capture" step every clienteling
 * platform shows at close-out (Tulip "Outcome", Endear "Result", BSPK
 * "Visit summary"). The visual is a radio-card grid, not a select dropdown —
 * the BA reads all options in one glance instead of opening a menu.
 */
export function OutcomeRadioGroup({
  value,
  onChange,
  disabled = false,
}: OutcomeRadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Resultado de la cita"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {APPOINTMENT_OUTCOME_CODES.map((code) => {
        const active = value === code;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(code)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "border-foreground/40 bg-foreground/[0.03] shadow-sm"
                : "border-border bg-card hover:border-foreground/15 hover:bg-muted/30",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="text-sm font-medium text-foreground">
              {APPOINTMENT_OUTCOME_LABEL[code]}
            </span>
            <span className="text-xs text-muted-foreground">
              {APPOINTMENT_OUTCOME_HINT[code]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
