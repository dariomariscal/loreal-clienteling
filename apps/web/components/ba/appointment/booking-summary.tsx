"use client";

import * as React from "react";
import { TimePill } from "../time-pill";

interface BookingSummaryProps {
  startsAt: string;
  durationMinutes: number;
  serviceName: string;
  serviceColor?: string | null;
  customerName?: string;
}

// VISUAL DEVICE: vertical TimePill + grouped text. No accent card.
//
// El preview es preview, no acción. Reusa la TimePill vertical del
// sistema (la misma de /ba/schedule) para que la familiaridad sea
// inmediata. Cero borde, cero shadow — vive como un bloque
// tipográfico anclado por el TimePill.
export function BookingSummary({
  startsAt,
  durationMinutes,
  serviceName,
  serviceColor,
  customerName,
}: BookingSummaryProps) {
  const d = new Date(startsAt);
  const dayLabel = d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex items-center gap-4 rounded-lg bg-muted/30 px-4 py-3">
      <TimePill
        iso={startsAt}
        color={serviceColor ?? null}
        durationMinutes={durationMinutes}
        variant="vertical"
      />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[14px] text-foreground"
          style={{ fontWeight: 540 }}
        >
          {capitalize(dayLabel)}
        </p>
        <p className="truncate text-[12.5px] text-muted-foreground">
          {durationMinutes} min · {serviceName}
        </p>
        {customerName ? (
          <p className="truncate text-[12.5px] text-muted-foreground">
            con {customerName}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
