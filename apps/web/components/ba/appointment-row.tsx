"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TimePill } from "./time-pill";

export type AppointmentRowStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "no_show";

export type AppointmentRowEmphasis = "next" | "current" | "default";

interface AppointmentRowProps {
  customerId: string;
  customerName: string;
  scheduledAt: string;
  durationMinutes: number;
  eventTypeName: string | null;
  eventTypeColor: string | null;
  isVirtual?: boolean;
  status?: AppointmentRowStatus;
  emphasis?: AppointmentRowEmphasis;
  className?: string;
}

// VISUAL DEVICE: 72px list row anchored by a vertical TimePill.
//
// Cal.com-style time + duration block on the left, then customer +
// service in the middle, then a single 8px status dot on the right.
// No chip, no left color bar. The Attio/Linear philosophy holds: one
// signifier per axis, and the TimePill already carries the color of
// the event type (border + bg at low alpha), so the status dot can
// stay tiny without losing meaning.
//
// "Next" appointment gets the only chrome of the screen: a 2px left
// border in accent, no fill, no shadow. "Current" dims the row to 60%
// and prefixes a 6px accent dot at the left edge — Cal.com "now-line"
// pattern, adapted to the row format.
export function AppointmentRow({
  customerId,
  customerName,
  scheduledAt,
  durationMinutes,
  eventTypeName,
  eventTypeColor,
  isVirtual,
  status = "confirmed",
  emphasis = "default",
  className,
}: AppointmentRowProps) {
  return (
    <Link
      href={`/ba/customers/${customerId}`}
      className={cn(
        "group/appt relative flex h-[72px] items-center gap-4 px-4 transition-colors",
        "hover:bg-muted/40",
        emphasis === "next" && "border-l-2 border-[var(--ba-accent)] pl-[14px]",
        emphasis === "current" && "opacity-60",
        status === "cancelled" && "text-muted-foreground line-through",
        className,
      )}
    >
      {emphasis === "current" ? (
        <span
          aria-hidden
          className="absolute -left-0.5 size-1.5 rounded-full bg-[var(--ba-accent)]"
        />
      ) : null}

      <TimePill
        iso={scheduledAt}
        color={eventTypeColor}
        durationMinutes={durationMinutes}
        variant="vertical"
      />

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[14px] text-foreground"
          style={{ fontWeight: 540 }}
        >
          {customerName}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {eventTypeName ?? "Cita"}
          {isVirtual ? " · virtual" : ""}
        </p>
      </div>

      <StatusDot status={status} />
    </Link>
  );
}

// ── Status dot — 8px far-right, no chip ─────────────────────────────

function StatusDot({ status }: { status: AppointmentRowStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      aria-label={meta.label}
      className={cn(
        "size-2 shrink-0 rounded-full",
        meta.className,
      )}
    />
  );
}

const STATUS_META: Record<AppointmentRowStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmada", className: "bg-[var(--ba-accent)]" },
  pending: { label: "Pendiente", className: "bg-[var(--warning)]" },
  cancelled: {
    label: "Cancelada",
    className: "bg-muted-foreground/40",
  },
  no_show: {
    label: "No asistió",
    className: "border border-destructive bg-transparent",
  },
};
