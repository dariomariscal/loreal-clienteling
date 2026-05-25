"use client";

import * as React from "react";
import { useCustomerActivity } from "@/lib/hooks";
import type {
  CustomerActivityEvent,
  CustomerActivityType,
} from "@loreal/contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TimelineIllustration } from "@/components/ui/illustrations";
import { cn } from "@/lib/utils";

// ── Customer activity timeline ─────────────────────────────────────
// Merged feed of orders, recommendations, appointments, messages, notes
// and the synthetic registration event. Backend already sorts and
// cursor-paginates, so we just render and call fetchNextPage on demand.
//
// Layout: classic vertical timeline with a left rail of dots, day group
// labels and per-event editorial cards.

interface ActivityTimelineProps {
  customerId: string;
}

export function ActivityTimeline({ customerId }: ActivityTimelineProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useCustomerActivity(customerId, 20);

  const events = React.useMemo(
    () => (data?.pages.flatMap((p) => p.events) ?? []) as CustomerActivityEvent[],
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">
          No se pudo cargar el historial.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 text-[12px] text-destructive underline-offset-4 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        illustration={<TimelineIllustration />}
        title="Sin actividad todavía"
        description="Cuando registres compras, citas, recomendaciones, mensajes o notas, aparecerán aquí en orden cronológico."
      />
    );
  }

  const groups = groupByDay(events);

  return (
    <div className="relative">
      {/* The vertical rail — sits behind the day groups and dots. */}
      <span
        className="absolute left-[15px] top-0 bottom-0 w-px bg-border/50"
        aria-hidden
      />

      <ul className="space-y-6">
        {groups.map((g) => (
          <li key={g.dayKey} className="space-y-3">
            <DayHeader label={g.dayLabel} />
            <ul className="space-y-2.5">
              {g.events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Header for each day group ─────────────────────────────────────

function DayHeader({ label }: { label: string }) {
  return (
    <div className="relative flex items-center pl-10">
      <span
        className="absolute left-[10px] flex size-3 items-center justify-center rounded-full border border-border bg-background"
        aria-hidden
      >
        <span className="size-1.5 rounded-full bg-foreground/40" />
      </span>
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

// ── Per-event card ────────────────────────────────────────────────

function EventRow({ event }: { event: CustomerActivityEvent }) {
  const meta = TYPE_META[event.type] ?? TYPE_META.note;
  const time = new Date(event.occurredAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="relative pl-10">
      {/* Dot on the rail */}
      <span
        className="absolute left-[6px] top-3 flex size-[18px] items-center justify-center rounded-full border-2 border-background"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      >
        <meta.icon className="size-2.5 text-background" />
      </span>

      <div
        className={cn(
          "rounded-xl border border-border/60 bg-card p-3.5",
          "transition-shadow duration-200 hover:shadow-sm",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-heading text-[14px] leading-tight text-foreground">
              {event.title}
            </p>
            {event.body && (
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                {event.type === "note" ? `“${event.body}”` : event.body}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">
              <time>{time}</time>
              {event.actor.name && <> · {event.actor.name}</>}
              {event.type === "note" && event.metadata?.private === true && (
                <> · Privada</>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {event.amount !== null && (
              <span className="font-heading text-sm tabular-nums text-foreground">
                ${event.amount.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            )}
            <EventBadge event={event} />
          </div>
        </div>
      </div>
    </li>
  );
}

function EventBadge({ event }: { event: CustomerActivityEvent }) {
  if (event.type === "appointment") {
    const status = event.metadata?.status as string | undefined;
    if (status === "completed")
      return <Badge variant="success" size="sm">Completada</Badge>;
    if (status === "cancelled")
      return <Badge variant="destructive" size="sm">Cancelada</Badge>;
    if (status === "no_show")
      return <Badge variant="destructive" size="sm">No asistió</Badge>;
    if (event.metadata?.isPast)
      return <Badge variant="secondary" size="sm">Pasada</Badge>;
    return <Badge variant="info" size="sm">Próxima</Badge>;
  }
  if (event.type === "message") {
    const ch = event.metadata?.channel as string | undefined;
    if (ch)
      return (
        <Badge variant="secondary" size="sm" className="uppercase">
          {ch}
        </Badge>
      );
  }
  if (event.type === "customer_registered") {
    return <Badge variant="info" size="sm">Registro</Badge>;
  }
  return null;
}

// ── Type → icon + color ───────────────────────────────────────────

interface TypeMeta {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TYPE_META: Record<CustomerActivityType, TypeMeta> = {
  customer_registered: { color: "#94A3B8", icon: SparkleIcon },
  order: { color: "#16A34A", icon: BagIcon },
  recommendation: { color: "#A855F7", icon: SparkleIcon },
  appointment: { color: "#3B82F6", icon: CalendarIcon },
  message: { color: "#0EA5E9", icon: MessageIcon },
  note: { color: "#6B7280", icon: NoteIcon },
};

// ── Helpers ───────────────────────────────────────────────────────

interface DayGroup {
  dayKey: string;
  dayLabel: string;
  events: CustomerActivityEvent[];
}

function groupByDay(events: CustomerActivityEvent[]): DayGroup[] {
  const buckets = new Map<string, CustomerActivityEvent[]>();
  for (const e of events) {
    const d = new Date(e.occurredAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = buckets.get(key) ?? [];
    arr.push(e);
    buckets.set(key, arr);
  }
  // Buckets are inserted in order because the backend returns events sorted
  // desc; preserving insertion order is enough.
  return Array.from(buckets.entries()).map(([key, eventList]) => ({
    dayKey: key,
    dayLabel: formatDayLabel(new Date(eventList[0].occurredAt)),
    events: eventList,
  }));
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today.getTime() - d.getTime()) / (24 * 3600 * 1000),
  );
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) {
    return date.toLocaleDateString("es-MX", { weekday: "long" });
  }
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Icons ────────────────────────────────────────────────────────

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8h14l-1.5 12.5a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5L5 8z" />
      <path d="M9 8V5.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6z" />
    </svg>
  );
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M15 4v5h5" />
    </svg>
  );
}
