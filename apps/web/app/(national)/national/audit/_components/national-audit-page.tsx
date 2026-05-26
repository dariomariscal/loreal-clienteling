"use client";

import { useMemo, useState } from "react";
import { subDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { ActivityGlyph } from "@/components/ui/glyphs";
import {
  useAuditLogsSummary,
  type AuditSummary,
} from "@/lib/hooks/use-audit-logs";
import { KpiSparklineCard } from "@/components/manager/kpi-sparkline-card";
import { formatCompactNumber } from "@/components/manager/format";
import { cn } from "@/lib/utils";

type RangePreset = "7d" | "30d" | "90d";

const RANGE_LABEL: Record<RangePreset, string> = {
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
};

const RANGE_DAYS: Record<RangePreset, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const CRITICAL_ACTIONS = new Set([
  "delete",
  "role_change",
  "grant_access",
  "revoke_access",
  "export",
]);

/**
 * NRM audit view — aggregated only, never raw rows. Pattern lifted from
 * compliance dashboards (MetricStream/ABP): KPIs on top, stacked
 * horizontal bars for action / entityType mix (no pie charts — Cleveland
 * showed bars are more accurate for proportional comparisons), top actors
 * as small cards. Row-level audit access stays admin-only by design.
 */
export function NationalAuditPage() {
  const [range, setRange] = useState<RangePreset>("30d");

  const { from, to } = useMemo(() => {
    const to = new Date();
    const from = subDays(to, RANGE_DAYS[range]);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [range]);

  const { data, isLoading } = useAuditLogsSummary({ from, to, limit: 20 });

  const totalEvents = data?.totals.events ?? 0;
  const uniqueActors = data?.topActors.length ?? 0;
  const criticalCount = useMemo(
    () =>
      (data?.byAction ?? [])
        .filter((a) => CRITICAL_ACTIONS.has(a.action))
        .reduce((sum, a) => sum + a.count, 0),
    [data],
  );
  const topAction = data?.byAction[0];

  return (
    <SingleColumn>
      <div className="flex h-full w-full flex-col">
        <header className="border-b border-border bg-background px-6 py-5 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
                Auditoría
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Resumen de actividad ·{" "}
                {data
                  ? `${format(new Date(data.period.from), "d MMM", { locale: es })} – ${format(new Date(data.period.to), "d MMM yyyy", { locale: es })}`
                  : "Cargando rango…"}
              </p>
            </div>
            <RangeSelector value={range} onChange={setRange} />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6 lg:px-10">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiSparklineCard
                label="Eventos totales"
                value={formatCompactNumber(totalEvents)}
                helper={`En los últimos ${RANGE_DAYS[range]} días`}
                loading={isLoading}
              />
              <KpiSparklineCard
                label="Actores únicos"
                value={uniqueActors}
                helper="Personas que tocaron datos"
                loading={isLoading}
              />
              <KpiSparklineCard
                label="Acciones críticas"
                value={criticalCount}
                helper="Borrados, cambios de rol, exports"
                loading={isLoading}
              />
              <KpiSparklineCard
                label="Acción más común"
                value={topAction ? humanAction(topAction.action) : "—"}
                helper={
                  topAction
                    ? `${formatCompactNumber(topAction.count)} veces`
                    : undefined
                }
                loading={isLoading}
              />
            </div>

            <SectionCard title="Mezcla de acciones">
              {isLoading ? (
                <BarSkeleton />
              ) : !data || data.byAction.length === 0 ? (
                <AdvisorEmptyState
                  icon={<ActivityGlyph className="size-6" />}
                  title="Sin actividad en el período"
                />
              ) : (
                <CompositionBars rows={data.byAction.map((r) => ({
                  label: humanAction(r.action),
                  count: r.count,
                  isCritical: CRITICAL_ACTIONS.has(r.action),
                }))} />
              )}
            </SectionCard>

            <SectionCard title="Entidades tocadas">
              {isLoading ? (
                <BarSkeleton />
              ) : !data || data.byEntityType.length === 0 ? (
                <AdvisorEmptyState
                  icon={<ActivityGlyph className="size-6" />}
                  title="Sin entidades en el período"
                />
              ) : (
                <CompositionBars rows={data.byEntityType.map((r) => ({
                  label: humanEntityType(r.entityType),
                  count: r.count,
                }))} />
              )}
            </SectionCard>

            <SectionCard title="Top actores">
              {isLoading ? (
                <ActorsSkeleton />
              ) : !data || data.topActors.length === 0 ? (
                <AdvisorEmptyState
                  icon={<ActivityGlyph className="size-6" />}
                  title="Sin actores en el período"
                />
              ) : (
                <TopActors actors={data.topActors} />
              )}
            </SectionCard>

            <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-4 text-xs text-muted-foreground">
              El detalle fila-por-fila está reservado a administradores. Si
              necesitas exportar un log completo, pide al equipo de admin.
            </div>
          </div>
        </div>
      </div>
    </SingleColumn>
  );
}

// ── Composition bars ──────────────────────────────────────────────────────

interface CompositionRow {
  label: string;
  count: number;
  isCritical?: boolean;
}

function CompositionBars({ rows }: { rows: CompositionRow[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="space-y-2 px-4 py-3">
      {rows.map((r) => {
        const pct = Math.round((r.count / total) * 100);
        const widthPct = (r.count / max) * 100;
        return (
          <li key={r.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">{r.label}</span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {formatCompactNumber(r.count)}
                </span>{" "}
                · {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  r.isCritical
                    ? "bg-destructive/80"
                    : "bg-[color:var(--ba-accent)]",
                )}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BarSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1">
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ── Top actors ────────────────────────────────────────────────────────────

function TopActors({ actors }: { actors: AuditSummary["topActors"] }) {
  const max = Math.max(1, ...actors.map((a) => a.count));
  return (
    <ul className="divide-y divide-border">
      {actors.map((a) => {
        const widthPct = (a.count / max) * 100;
        return (
          <li
            key={a.actorUserId ?? `unknown-${a.count}`}
            className="flex items-center gap-3 px-4 py-3"
          >
            <CustomerAvatar
              firstName={a.actorFullName ?? "Sistema"}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {a.actorFullName ?? "Sistema / acceso anónimo"}
              </p>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[color:var(--ba-accent)]"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatCompactNumber(a.count)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ActorsSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="size-8 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-1 w-full animate-pulse rounded-full bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────

function humanAction(action: string): string {
  const map: Record<string, string> = {
    create: "Crear",
    update: "Actualizar",
    delete: "Eliminar",
    access: "Acceder",
    export: "Exportar",
    role_change: "Cambio de rol",
    grant_access: "Otorgar acceso",
    revoke_access: "Revocar acceso",
  };
  return map[action] ?? action.replace(/_/g, " ");
}

function humanEntityType(entityType: string): string {
  const map: Record<string, string> = {
    customer: "Clienta",
    order: "Orden",
    appointment: "Cita",
    user: "Usuario",
    brand: "Marca",
    template: "Plantilla",
    segment: "Segmento",
    approval: "Aprobación",
    event: "Evento",
  };
  return map[entityType] ?? entityType.replace(/_/g, " ");
}

// ── Controls ──────────────────────────────────────────────────────────────

function RangeSelector({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Rango"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {(Object.keys(RANGE_LABEL) as RangePreset[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={
              active
                ? "rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
                : "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40"
            }
          >
            {RANGE_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}
