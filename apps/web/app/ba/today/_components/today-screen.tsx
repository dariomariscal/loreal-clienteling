"use client";

import * as React from "react";
import Link from "next/link";
import { ViewHeader } from "../../_components/view-header";
import { CustomerSummaryCard } from "@/components/ba";
import { useDailyOpportunities } from "@/lib/hooks/use-ai";
import { useAppointmentCalendar } from "@/lib/hooks";
import type { SessionUser } from "@/lib/auth";
import { AppointmentGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

interface TodayScreenProps {
  user: SessionUser;
}

// Pantalla del día — mixed-rhythm composition.
//   - Greeting:  plain heading, no chrome
//   - 5 clientas:  horizontal cards (heterogeneous browse-and-pick)
//   - 3 citas:    inset list with time pill (homogeneous, scannable)
//
// Each block has its own visual rhythm so the eye distinguishes
// "decisions to make" from "facts to know".
export function TodayScreen({ user }: TodayScreenProps) {
  const today = React.useMemo(() => formatToday(), []);
  const dateRange = React.useMemo(() => getTodayRange(), []);
  const firstName = user.fullName.split(" ")[0] ?? "";
  const greeting = useGreeting();

  const opportunities = useDailyOpportunities(undefined, 5);
  const appointments = useAppointmentCalendar(dateRange.from, dateRange.to, {
    baUserId: user.id,
  });

  const apptItems = (appointments.data ?? [])
    .slice()
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <>
      <ViewHeader eyebrow={today} title={`${greeting}, ${firstName}.`} />

      <div className="px-8 pt-8 pb-16">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* ── Block 1: Importan hoy — visual rhythm: cards ────────────── */}
          <section aria-labelledby="today-opportunities">
            <SectionHeader
              id="today-opportunities"
              label="Importan hoy"
              count={opportunities.data?.length}
            />

            {opportunities.isLoading ? (
              <CardSkeleton />
            ) : opportunities.isError ? (
              <ErrorRow onRetry={() => opportunities.refetch()} />
            ) : (opportunities.data?.length ?? 0) === 0 ? (
              <EmptyOpportunities />
            ) : (
              <ul className="space-y-2.5">
                {opportunities.data!.map((o) => (
                  <li key={o.id}>
                    <CustomerSummaryCard
                      customerId={o.customerId}
                      firstName={o.customer.firstName}
                      lastName={o.customer.lastName}
                      rationale={o.summary}
                      suggestedAction={o.suggestedAction}
                      reason={o.reason}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Block 2: Citas hoy — visual rhythm: inset list ──────────── */}
          <section aria-labelledby="today-appointments">
            <SectionHeader
              id="today-appointments"
              label="Citas hoy"
              count={apptItems.length}
            />

            {appointments.isLoading ? (
              <ListSkeleton />
            ) : apptItems.length === 0 ? (
              <EmptyAppointments />
            ) : (
              <ul className="divide-y divide-border/40 rounded-xl border border-border/40 bg-card">
                {apptItems.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/ba/customers/${a.customerId}`}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <TimePill iso={a.scheduledAt} color={a.eventTypeColor} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] text-foreground">
                          {a.customerName}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {a.eventTypeName ?? "Cita"}
                          {a.isVirtual ? " · virtual" : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

// ── Section header — eyebrow + count, no border ─────────────────────

function SectionHeader({
  id,
  label,
  count,
}: {
  id: string;
  label: string;
  count?: number;
}) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between">
      <h2
        id={id}
        className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
      >
        {label}
      </h2>
      {typeof count === "number" && count > 0 ? (
        <span className="text-[11px] tabular-nums text-muted-foreground/70">
          {count}
        </span>
      ) : null}
    </div>
  );
}

// ── Time pill — appointment ─────────────────────────────────────────

function TimePill({ iso, color }: { iso: string; color: string | null }) {
  const d = new Date(iso);
  return (
    <span
      className={cn(
        "inline-flex w-16 shrink-0 flex-col items-start rounded-md border border-border/40 bg-muted/40 px-2 py-1.5 text-foreground",
      )}
      style={color ? { borderColor: `${color}33`, backgroundColor: `${color}10` } : undefined}
    >
      <span className="font-mono text-[13px] tabular-nums leading-none">
        {d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </span>
  );
}

// ── Empty / loading / error states ──────────────────────────────────

function EmptyOpportunities() {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/40 px-5 py-8 text-center">
      <p className="text-[13px] text-muted-foreground">
        Hoy no hay sugerencias. Aprovecha el ritmo.
      </p>
    </div>
  );
}

function EmptyAppointments() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 px-5 py-5">
      <AppointmentGlyph className="size-5 text-muted-foreground/70" />
      <p className="text-[13px] text-muted-foreground">
        Sin citas hoy. Puedes agendar una desde el perfil de una clienta.
      </p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <ul className="space-y-2.5" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-[88px] animate-pulse rounded-xl bg-muted/40" />
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-border/40 rounded-xl border border-border/40" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-14 animate-pulse bg-muted/30" />
      ))}
    </ul>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
      <p className="text-[13px] text-destructive">No pude cargar tus sugerencias de hoy.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 text-[12px] text-destructive underline-offset-4 hover:underline"
      >
        Reintentar
      </button>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatToday(): string {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getTodayRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  return { from: start, to: end };
}

function useGreeting(): string {
  return React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }, []);
}
