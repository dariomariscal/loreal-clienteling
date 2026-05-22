"use client";

import type { AppointmentEventType } from "@/lib/hooks";

export function BookingPreview({
  eventType,
  startsAt,
  durationMinutes,
  customerName,
  accent,
}: {
  eventType: AppointmentEventType;
  startsAt: string;
  durationMinutes: number;
  customerName: string;
  accent: string;
}) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const dateLabel = start.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const startLabel = start.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = end.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-card p-4"
      style={{ borderColor: accent }}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {dateLabel}
      </p>
      <p className="mt-0.5 font-heading text-lg tabular-nums text-foreground">
        {startLabel} – {endLabel}
      </p>
      <p className="mt-1 text-sm text-foreground">
        {eventType.displayName}{" "}
        <span className="text-muted-foreground">· {customerName}</span>
      </p>
    </div>
  );
}
