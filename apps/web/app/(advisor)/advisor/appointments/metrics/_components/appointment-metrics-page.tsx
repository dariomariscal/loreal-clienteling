"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { AppointmentGlyph } from "@/components/ui/glyphs";
import { useAppointmentOverview } from "@/lib/hooks/use-appointment-analytics";
import { AppointmentKpiStrip } from "@/components/appointment/metrics/appointment-kpi-strip";
import { OutcomeBreakdownCard } from "@/components/appointment/metrics/outcome-breakdown-card";
import { ReasonsBreakdownCard } from "@/components/appointment/metrics/reasons-breakdown-card";
import { TrendCard } from "@/components/appointment/metrics/trend-card";
import { TeamRankingCard } from "@/components/appointment/metrics/team-ranking-card";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type RangePreset = "this_month" | "last_30d" | "ytd";

interface AppointmentMetricsPageProps {
  user: SessionUser;
}

/**
 * Appointment metrics page. Shape is identical for every role; the API
 * decides what to populate (e.g. teamRanking is null for BAs). KISS: one
 * page, role-aware data, instead of three near-duplicate pages.
 */
export function AppointmentMetricsPage({ user }: AppointmentMetricsPageProps) {
  const [preset, setPreset] = React.useState<RangePreset>("this_month");
  const range = React.useMemo(() => computeRange(preset), [preset]);

  const { data, isLoading } = useAppointmentOverview({
    from: range.from,
    to: range.to,
  });

  const showTeamRanking = !!data?.teamRanking;

  return (
    <SingleColumn>
      <div className="flex h-full flex-col">
        {/* ── Toolbar ──────────────────────────────────────────── */}
        <header className="border-b border-border/40 bg-[color:var(--ba-surface)] px-6 pb-4 pt-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
                Métricas de citas
              </h1>
              <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
                {labelForRole(user.role)} · {labelForRange(preset, range)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/advisor/appointments"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <AppointmentGlyph className="size-4 opacity-70" aria-hidden />
                Ver calendario
              </Link>
              <RangeSwitch value={preset} onChange={setPreset} />
            </div>
          </div>
        </header>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6 lg:px-10 lg:py-8">
            <AppointmentKpiStrip
              kpis={
                data?.kpis ?? {
                  total: 0,
                  scheduled: 0,
                  confirmed: 0,
                  completed: 0,
                  cancelled: 0,
                  noShow: 0,
                  rescheduled: 0,
                  showRatePct: 0,
                  conversionRatePct: 0,
                  revenuePerAppointment: 0,
                  totalAppointmentRevenue: 0,
                  averageAppointmentValue: 0,
                }
              }
              loading={isLoading}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <OutcomeBreakdownCard data={data?.outcomes ?? []} />
              <ReasonsBreakdownCard
                cancellations={data?.cancellationReasons ?? []}
                noShows={data?.noShowReasons ?? []}
              />
            </div>

            <TrendCard trend={data?.trend ?? []} />

            {showTeamRanking ? (
              <TeamRankingCard ranking={data?.teamRanking ?? []} />
            ) : null}
          </div>
        </div>
      </div>
    </SingleColumn>
  );
}

// ── Range presets ──────────────────────────────────────────────────

function computeRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  let from: Date;
  let to: Date;
  if (preset === "this_month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (preset === "last_30d") {
    from = new Date(now.getTime() - 30 * 86_400_000);
    to = now;
  } else {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function labelForRange(preset: RangePreset, range: { from: string; to: string }) {
  const fromDate = new Date(range.from);
  if (preset === "this_month") {
    return `Este mes · ${format(fromDate, "MMMM yyyy", { locale: es })}`;
  }
  if (preset === "last_30d") return "Últimos 30 días";
  return `Año a la fecha · ${fromDate.getFullYear()}`;
}

function labelForRole(role: string): string {
  switch (role) {
    case "beauty_advisor":
      return "Tus métricas";
    case "counter_manager":
      return "Tu counter";
    case "area_manager":
      return "Tu zona";
    case "national_retail_manager":
      return "Tu división";
    case "admin":
      return "Vista nacional";
    default:
      return "Métricas";
  }
}

// ── Range switch (Día / Mes pattern from appointments-page) ────────

function RangeSwitch({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}) {
  const items: { value: RangePreset; label: string }[] = [
    { value: "this_month", label: "Mes" },
    { value: "last_30d", label: "30d" },
    { value: "ytd", label: "YTD" },
  ];
  return (
    <div className="inline-flex h-10 gap-0.5 rounded-xl border border-border bg-muted/20 p-0.5">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-lg px-4 text-[13px] font-medium transition-all duration-150",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
