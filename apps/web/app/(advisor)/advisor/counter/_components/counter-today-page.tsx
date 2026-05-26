"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AppointmentGlyph,
  CheckCircleGlyph,
  PackageGlyph,
  RecommendGlyph,
  SparkleDotGlyph,
  StoreGlyph,
  UserPlusGlyph,
} from "@/components/ui/glyphs";
import { useCounterDashboardToday } from "@/lib/hooks/use-counter-dashboard";
import { CounterPulseHero } from "./counter-pulse-hero";

/**
 * Counter Manager home — the operational pulse of the counter HOY.
 * Refreshes every 60s (see useCounterDashboardToday).
 */
export function CounterTodayPage() {
  const { data, isLoading } = useCounterDashboardToday();
  const today = new Date();

  const pulse = data?.pulse;
  const operations = data?.operations;
  const team = data?.team;

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
              Mostrador hoy
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(today, "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <CounterPulseHero
            target={pulse?.target ?? null}
            totalSales={pulse?.totalSales ?? 0}
            orderCount={pulse?.orderCount ?? 0}
            loading={isLoading}
          />

          <PulseKpiGrid pulse={pulse} loading={isLoading} />

          <TeamPreviewCard
            rosterCount={team?.roster.filter((r) => r.isOnShiftNow).length ?? 0}
            totalRoster={team?.roster.length ?? 0}
            loading={isLoading}
          />

          <UpcomingEventsCard
            events={operations?.upcomingEvents ?? []}
            loading={isLoading}
          />

          <OperationsCard
            pendingApprovals={operations?.pendingApprovalCount ?? 0}
            stockAlerts={operations?.stockAlertCount ?? 0}
            loading={isLoading}
          />
        </div>
      </div>
    </SingleColumn>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function PulseKpiGrid({
  pulse,
  loading,
}: {
  pulse: ReturnType<typeof useCounterDashboardToday>["data"] extends infer T
    ? T extends { pulse: infer P }
      ? P
      : undefined
    : undefined;
  loading?: boolean;
}) {
  const apptCompleted = pulse?.appointments.completed ?? 0;
  const apptTotal = pulse?.appointments.total ?? 0;
  const samples = pulse?.samples;
  const reco = pulse?.recommendations;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label="Clientas atendidas"
        value={pulse?.uniqueCustomers ?? 0}
        helper={`${pulse?.newRegistrations ?? 0} nuevas registradas`}
        loading={loading}
      />
      <KpiCard
        label="Recomendaciones"
        value={
          reco
            ? reco.conversionPct !== null
              ? `${reco.conversionPct}%`
              : `${reco.converted} / ${reco.total}`
            : "—"
        }
        helper={
          reco
            ? `${reco.converted} convertidas de ${reco.total}`
            : "Sin recomendaciones aún"
        }
        loading={loading}
      />
      <KpiCard
        label="Muestras"
        value={samples?.delivered ?? 0}
        helper={`${samples?.converted ?? 0} regresaron a comprar`}
        loading={loading}
      />
      <KpiCard
        label="Citas"
        value={`${apptCompleted}/${apptTotal}`}
        helper={`${pulse?.appointments.noShow ?? 0} no-shows`}
        loading={loading}
      />
    </div>
  );
}

function TeamPreviewCard({
  rosterCount,
  totalRoster,
  loading,
}: {
  rosterCount: number;
  totalRoster: number;
  loading?: boolean;
}) {
  return (
    <SectionCard
      title="Mi equipo"
      action={
        <Link
          href="/advisor/counter/team"
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:underline"
        >
          Ver equipo →
        </Link>
      }
    >
      {loading ? (
        <div className="px-4 py-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-foreground">
          <span className="font-semibold tabular-nums">{rosterCount}</span>{" "}
          {rosterCount === 1 ? "BA en turno ahora" : "BAs en turno ahora"}
          <span className="text-muted-foreground">
            {" "}
            · {totalRoster} en el roster del día
          </span>
        </p>
      )}
    </SectionCard>
  );
}

function UpcomingEventsCard({
  events,
  loading,
}: {
  events: NonNullable<
    ReturnType<typeof useCounterDashboardToday>["data"]
  >["operations"]["upcomingEvents"];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <SectionCard title="Próximos eventos">
        <div className="space-y-3 px-4 py-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (events.length === 0) {
    return (
      <SectionCard title="Próximos eventos">
        <AdvisorEmptyState
          icon={<StoreGlyph className="size-6" />}
          title="Sin eventos próximos"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Próximos eventos"
      action={
        <Link
          href="/advisor/events"
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:underline"
        >
          Ver todos →
        </Link>
      }
    >
      <ul className="divide-y divide-border">
        {events.slice(0, 3).map((event) => (
          <li key={event.id} className="flex items-center gap-4 px-4 py-3">
            <time className="w-24 shrink-0 font-mono text-xs tabular-nums text-foreground">
              {format(new Date(event.startTime), "d MMM HH:mm", { locale: es })}
            </time>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {event.name}
              </p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {event.kind.replace("_", " ")}
              </p>
            </div>
            {event.capacity ? (
              <Badge variant="outline" className="tabular-nums">
                cap {event.capacity}
              </Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function OperationsCard({
  pendingApprovals,
  stockAlerts,
  loading,
}: {
  pendingApprovals: number;
  stockAlerts: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <SectionCard title="Operación">
        <div className="space-y-3 px-4 py-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Operación">
      <ul className="divide-y divide-border">
        <OperationsRow
          icon={<CheckCircleGlyph className="size-4" />}
          label="Aprobaciones pendientes"
          count={pendingApprovals}
          href="/advisor/counter/approvals"
          tone={pendingApprovals > 0 ? "warning" : "neutral"}
        />
        <OperationsRow
          icon={<PackageGlyph className="size-4" />}
          label="SKUs con stock bajo o agotado"
          count={stockAlerts}
          href="/advisor/catalog"
          tone={stockAlerts > 0 ? "warning" : "neutral"}
        />
      </ul>
    </SectionCard>
  );
}

function OperationsRow({
  icon,
  label,
  count,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
  tone: "neutral" | "warning";
}) {
  return (
    <li className="px-4 py-3">
      <Link
        href={href}
        className="flex items-center gap-3 rounded-md transition-colors hover:bg-muted/40"
      >
        <span
          className={
            tone === "warning"
              ? "text-[var(--color-warning,oklch(0.75_0.15_65))]"
              : "text-[color:var(--ba-accent)]"
          }
        >
          {icon}
        </span>
        <span className="flex-1 text-sm text-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {count}
        </span>
      </Link>
    </li>
  );
}
