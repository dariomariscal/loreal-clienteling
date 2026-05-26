"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SwimlaneEvent {
  /** Unique identifier (the underlying row id). */
  id: string;
  /** Optional group id — events with the same groupId render in the same color. */
  groupId?: string | null;
  name: string;
  kind: string;
  status: string;
  startTime: string;
  endTime: string;
  capacity?: number | null;
}

export interface SwimlaneLane {
  id: string;
  label: string;
  sublabel?: string;
  events: SwimlaneEvent[];
}

interface MultiStoreSwimlaneProps {
  lanes: SwimlaneLane[];
  /** Number of days to render. Defaults to 14 (two weeks). */
  daysToShow?: number;
  /** First day rendered. Defaults to monday of the current week. */
  initialStart?: Date;
  onEventClick?: (event: SwimlaneEvent, lane: SwimlaneLane) => void;
  loading?: boolean;
  className?: string;
}

/**
 * Swimlane scheduler — lanes are stores, the horizontal axis is time.
 * A multi-store rollout (events sharing a groupId) renders as bars of
 * the same hue across the rows, so the area manager can scan vertically
 * to see which stores are participating in each campaign.
 *
 * Anatomy follows DayPilot/Resource Guru: sticky left lane labels, sticky
 * top date header, day columns of equal width. Bars are positioned by
 * absolute % within their lane track based on day offset.
 */
export function MultiStoreSwimlane({
  lanes,
  daysToShow = 14,
  initialStart,
  onEventClick,
  loading,
  className,
}: MultiStoreSwimlaneProps) {
  const [windowStart, setWindowStart] = useState<Date>(
    () => initialStart ?? startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const days = useMemo(
    () => Array.from({ length: daysToShow }, (_, i) => addDays(windowStart, i)),
    [windowStart, daysToShow],
  );

  const windowEnd = addDays(windowStart, daysToShow);

  // Compute lane events filtered to the visible window — keeps the layout
  // calculations cheap.
  const visibleLanes = useMemo(
    () =>
      lanes.map((lane) => ({
        ...lane,
        events: lane.events.filter((ev) => {
          const start = new Date(ev.startTime);
          const end = new Date(ev.endTime);
          return end >= windowStart && start <= windowEnd;
        }),
      })),
    [lanes, windowStart, windowEnd],
  );

  // Pick a color per groupId so multi-store rollouts share a hue.
  const groupColors = useMemo(() => buildGroupColors(lanes), [lanes]);

  if (loading) {
    return (
      <div className={cn("space-y-2 p-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full w-full flex-col overflow-hidden", className)}>
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {format(windowStart, "d MMM", { locale: es })} –{" "}
            {format(addDays(windowStart, daysToShow - 1), "d MMM yyyy", {
              locale: es,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {daysToShow} días · {visibleLanes.length} tiendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWindowStart((d) => addDays(d, -daysToShow))}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setWindowStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWindowStart((d) => addDays(d, daysToShow))}
          >
            →
          </Button>
        </div>
      </header>

      <div className="relative flex-1 overflow-auto">
        <div className="relative min-w-fit">
          {/* Date header row */}
          <div className="sticky top-0 z-20 flex border-b border-border bg-card">
            <div className="sticky left-0 z-10 w-56 shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tienda
            </div>
            <div className="grid flex-1 grid-flow-col auto-cols-[minmax(72px,1fr)]">
              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-r border-border px-2 py-2 text-center text-xs",
                      isToday && "bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))]",
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(day, "EEE", { locale: es })}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 font-semibold tabular-nums",
                        isToday
                          ? "text-[color:var(--ba-accent)]"
                          : "text-foreground",
                      )}
                    >
                      {format(day, "d", { locale: es })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lanes */}
          <div>
            {visibleLanes.map((lane) => (
              <LaneRow
                key={lane.id}
                lane={lane}
                windowStart={windowStart}
                daysToShow={daysToShow}
                groupColors={groupColors}
                onEventClick={onEventClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LaneRow({
  lane,
  windowStart,
  daysToShow,
  groupColors,
  onEventClick,
}: {
  lane: SwimlaneLane;
  windowStart: Date;
  daysToShow: number;
  groupColors: Map<string, string>;
  onEventClick?: (event: SwimlaneEvent, lane: SwimlaneLane) => void;
}) {
  return (
    <div className="flex border-b border-border last:border-b-0">
      <div className="sticky left-0 z-10 flex w-56 shrink-0 items-center border-r border-border bg-card px-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {lane.label}
          </p>
          {lane.sublabel ? (
            <p className="truncate text-[11px] text-muted-foreground">
              {lane.sublabel}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative h-16 flex-1 bg-background">
        {/* Day grid lines (gives the lane visual rhythm) */}
        <div className="absolute inset-0 grid grid-flow-col auto-cols-[minmax(72px,1fr)]">
          {Array.from({ length: daysToShow }, (_, i) => (
            <div key={i} className="border-r border-border/60" />
          ))}
        </div>

        {/* Event bars */}
        {lane.events.map((ev) => (
          <EventBar
            key={ev.id}
            event={ev}
            windowStart={windowStart}
            daysToShow={daysToShow}
            color={
              ev.groupId
                ? groupColors.get(ev.groupId) ?? "var(--ba-accent)"
                : "var(--ba-accent)"
            }
            onClick={() => onEventClick?.(ev, lane)}
          />
        ))}
      </div>
    </div>
  );
}

function EventBar({
  event,
  windowStart,
  daysToShow,
  color,
  onClick,
}: {
  event: SwimlaneEvent;
  windowStart: Date;
  daysToShow: number;
  color: string;
  onClick: () => void;
}) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const startOffset = Math.max(0, differenceInCalendarDays(start, windowStart));
  const rawSpan = differenceInCalendarDays(end, start) || 1;
  const span = Math.min(daysToShow - startOffset, Math.max(1, rawSpan));
  const leftPct = (startOffset / daysToShow) * 100;
  const widthPct = (span / daysToShow) * 100;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${event.name} · ${format(start, "d MMM HH:mm", { locale: es })}`}
      className="absolute top-2 bottom-2 inline-flex items-center gap-2 overflow-hidden rounded-md px-2 text-left text-[11px] font-medium text-white shadow-sm transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-foreground/40"
      style={{
        left: `calc(${leftPct}% + 4px)`,
        width: `calc(${widthPct}% - 8px)`,
        backgroundColor: color,
      }}
    >
      <span className="truncate">{event.name}</span>
      <span className="ml-auto shrink-0 rounded-full bg-black/15 px-1.5 text-[10px] tabular-nums">
        {format(start, "HH:mm")}
      </span>
    </button>
  );
}

const HUES = [
  "oklch(0.58 0.13 38)", // L'Oréal accent
  "oklch(0.55 0.14 220)", // blue
  "oklch(0.55 0.15 145)", // green
  "oklch(0.62 0.16 320)", // magenta
  "oklch(0.62 0.15 80)", // amber
  "oklch(0.50 0.10 280)", // violet
];

function buildGroupColors(lanes: SwimlaneLane[]): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const lane of lanes) {
    for (const ev of lane.events) {
      if (ev.groupId && !map.has(ev.groupId)) {
        map.set(ev.groupId, HUES[idx % HUES.length]);
        idx += 1;
      }
    }
  }
  return map;
}
