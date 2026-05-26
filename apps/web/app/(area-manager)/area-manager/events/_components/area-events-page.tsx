"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import {
  AppointmentGlyph,
  CalendarPlusGlyph,
} from "@/components/ui/glyphs";
import { useEvents } from "@/lib/hooks/use-events";
import { useStores } from "@/lib/hooks/use-stores";
import {
  MultiStoreSwimlane,
  type SwimlaneEvent,
  type SwimlaneLane,
} from "@/components/manager/multi-store-swimlane";
import { MultiStoreEventSheet } from "./multi-store-event-sheet";

type ViewMode = "list" | "swimlane";

/**
 * Events for the entire zone. The list view (T2) lands first; the swimlane
 * (T3) lives as a toggle and uses the same data. List groups events by
 * `eventGroupId` so a multi-store rollout collapses to one card with the
 * locations stacked below.
 */
export function AreaEventsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: events, isLoading } = useEvents();
  const { data: stores } = useStores();

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stores ?? []) m.set(s.id, s.displayName);
    return m;
  }, [stores]);

  // Group rows that share an eventGroupId. The API field isn't yet on the
  // StoreEvent type — use a cast so we can read it without a wider refactor.
  const groupedEvents = useMemo(
    () => groupEventsByRollout(events ?? [], storeNameById),
    [events, storeNameById],
  );

  return (
    <SingleColumn>
      <div className="flex h-full w-full flex-col">
        <header className="border-b border-border bg-background px-6 py-5 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
                Eventos
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Programados y en curso en toda tu zona
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ViewSelector value={view} onChange={setView} />
              <Button
                size="lg"
                onClick={() => setSheetOpen(true)}
                className="min-h-11"
              >
                <CalendarPlusGlyph className="size-4" aria-hidden />
                Programar en varias tiendas
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {view === "list" ? (
            <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10">
              <EventsListView
                groups={groupedEvents}
                loading={isLoading}
                storeNameById={storeNameById}
              />
            </div>
          ) : (
            <SwimlaneView
              events={events ?? []}
              storeNameById={storeNameById}
              storeOrder={(stores ?? []).map((s) => s.id)}
              storeBannerById={
                new Map((stores ?? []).map((s) => [s.id, s.banner]))
              }
              loading={isLoading}
            />
          )}
        </div>
      </div>

      <MultiStoreEventSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        stores={stores ?? []}
      />
    </SingleColumn>
  );
}

// ── Grouping helper ────────────────────────────────────────────────────────

interface EventGroup {
  /** Synthetic key: groupId when present, otherwise the event id. */
  key: string;
  isMultiStore: boolean;
  name: string;
  description: string | null;
  kind: string;
  startTime: string;
  endTime: string;
  status: string;
  /** One row per store in the rollout. */
  occurrences: Array<{
    id: string;
    storeId: string;
    storeName: string;
    capacity: number | null;
  }>;
}

function groupEventsByRollout(
  events: ReturnType<typeof useEvents>["data"] extends infer T
    ? T extends Array<infer R>
      ? R[]
      : []
    : [],
  storeNameById: Map<string, string>,
): EventGroup[] {
  type EventWithGroup = (typeof events)[number] & {
    eventGroupId?: string | null;
  };
  const groups = new Map<string, EventGroup>();
  for (const ev of events as EventWithGroup[]) {
    const groupId = ev.eventGroupId ?? ev.id;
    const existing = groups.get(groupId);
    const occurrence = {
      id: ev.id,
      storeId: ev.storeId,
      storeName: storeNameById.get(ev.storeId) ?? "Tienda",
      capacity: ev.capacity ?? null,
    };
    if (existing) {
      existing.occurrences.push(occurrence);
      existing.isMultiStore = true;
    } else {
      groups.set(groupId, {
        key: groupId,
        isMultiStore: false,
        name: ev.name,
        description: ev.description,
        kind: ev.kind,
        startTime: ev.startTime,
        endTime: ev.endTime,
        status: ev.status,
        occurrences: [occurrence],
      });
    }
  }
  return Array.from(groups.values()).sort(
    (a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
}

// ── List view ──────────────────────────────────────────────────────────────

function EventsListView({
  groups,
  loading,
  storeNameById: _storeNameById,
}: {
  groups: EventGroup[];
  loading: boolean;
  storeNameById: Map<string, string>;
}) {
  if (loading) {
    return (
      <SectionCard title="Próximos eventos">
        <div className="space-y-3 px-4 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (groups.length === 0) {
    return (
      <SectionCard title="Próximos eventos">
        <AdvisorEmptyState
          icon={<AppointmentGlyph className="size-6" />}
          title="Sin eventos programados"
          description="Programa un evento en una o varias tiendas con el botón superior."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`Eventos (${groups.length})`}>
      <ul className="divide-y divide-border">
        {groups.map((group) => (
          <EventGroupRow key={group.key} group={group} />
        ))}
      </ul>
    </SectionCard>
  );
}

function EventGroupRow({ group }: { group: EventGroup }) {
  const when = `${format(new Date(group.startTime), "d MMM HH:mm", { locale: es })}`;

  return (
    <li className="px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {group.name}
            </p>
            {group.isMultiStore ? (
              <Badge className="bg-[color:var(--ba-accent)] text-[color:var(--ba-accent-foreground)]">
                {group.occurrences.length} tiendas
              </Badge>
            ) : null}
            <Badge variant="outline" className="capitalize">
              {group.kind.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {when}
            {" · "}
            <span className="capitalize">{group.status}</span>
          </p>
          {group.description ? (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {group.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Per-store occurrences. Lets a manager glance which stores are
          participating in a rollout without leaving the list. */}
      <ul className="mt-3 flex flex-wrap gap-2">
        {group.occurrences.map((occ) => (
          <li key={occ.id}>
            <Link
              href={`/advisor/events/${occ.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-muted/40"
            >
              <span className="font-medium text-foreground">{occ.storeName}</span>
              {occ.capacity ? (
                <span className="tabular-nums text-muted-foreground">
                  · cap {occ.capacity}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

// ── Swimlane view (Tier-3) ─────────────────────────────────────────────────

type EventRow = ReturnType<typeof useEvents>["data"] extends infer T
  ? T extends Array<infer R>
    ? R & { eventGroupId?: string | null }
    : never
  : never;

function SwimlaneView({
  events,
  storeNameById,
  storeOrder,
  storeBannerById,
  loading,
}: {
  events: EventRow[];
  storeNameById: Map<string, string>;
  storeOrder: string[];
  storeBannerById: Map<string, string>;
  loading: boolean;
}) {
  // Build lanes deterministically — preserve the order of `useStores()` so
  // the same area looks the same every visit (no jumping rows).
  const lanesByStore = new Map<string, SwimlaneLane>();
  for (const storeId of storeOrder) {
    lanesByStore.set(storeId, {
      id: storeId,
      label: storeNameById.get(storeId) ?? "Tienda",
      sublabel: storeBannerById.get(storeId) ?? undefined,
      events: [],
    });
  }
  for (const ev of events) {
    const lane = lanesByStore.get(ev.storeId);
    if (!lane) continue;
    const sw: SwimlaneEvent = {
      id: ev.id,
      groupId: ev.eventGroupId ?? null,
      name: ev.name,
      kind: ev.kind,
      status: ev.status,
      startTime: ev.startTime,
      endTime: ev.endTime,
      capacity: ev.capacity,
    };
    lane.events.push(sw);
  }

  const lanes = Array.from(lanesByStore.values()).filter(
    (l) => l.events.length > 0,
  );

  if (!loading && lanes.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10">
        <SectionCard title="Swimlane">
          <AdvisorEmptyState
            icon={<AppointmentGlyph className="size-6" />}
            title="Sin eventos en las próximas dos semanas"
            description="Programa un evento multi-tienda con el botón superior."
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MultiStoreSwimlane lanes={lanes} loading={loading} />
    </div>
  );
}

// ── Controls ───────────────────────────────────────────────────────────────

function ViewSelector({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Vista"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      <ViewButton active={value === "list"} onClick={() => onChange("list")}>
        Lista
      </ViewButton>
      <ViewButton
        active={value === "swimlane"}
        onClick={() => onChange("swimlane")}
      >
        Swimlane
      </ViewButton>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
          : "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40"
      }
    >
      {children}
    </button>
  );
}
