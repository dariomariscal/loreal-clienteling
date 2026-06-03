"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  useDashboardMetrics,
  useSalesTrend,
  useSalesBreakdown,
  useBaPerformance,
  useAppointmentMetrics,
  useAppointmentsByBa,
  useAgendaReport,
  useConversionMetrics,
  useCustomerSegments,
  useRetention,
  useAnalyticsExport,
} from "@/lib/hooks";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";

const AreaChart = dynamic(
  () => import("@/components/charts/area-chart").then((m) => m.AreaChart),
  { ssr: false },
);
const BarChart = dynamic(
  () => import("@/components/charts/bar-chart").then((m) => m.BarChart),
  { ssr: false },
);
const DonutChart = dynamic(
  () => import("@/components/charts/donut-chart").then((m) => m.DonutChart),
  { ssr: false },
);

// ── Constants ──────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "citas", label: "Citas" },
  { id: "clientes", label: "Clientes" },
  { id: "conversion", label: "Conversión" },
  { id: "retencion", label: "Retención" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SEGMENT_LABEL: Record<string, string> = {
  new: "Nuevas",
  returning: "Recurrentes",
  vip: "VIP",
  at_risk: "En riesgo",
};

const SEGMENT_COLOR: Record<string, string> = {
  new: "#4A7C59",
  returning: "#5B7FA5",
  vip: "#C9A96E",
  at_risk: "#D4A017",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
  rescheduled: "Reagendada",
};

const STATUS_VARIANT: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
  scheduled: "info",
  confirmed: "info",
  completed: "success",
  cancelled: "destructive",
  no_show: "warning",
  rescheduled: "secondary",
};

// ── Main Component ─────────────────────────────────────────────────

interface AnalyticsPageProps {
  user: { role?: string | null };
}

export function AnalyticsPage({ user }: AnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const exportData = useAnalyticsExport();

  const exportType = activeTab === "citas" ? "agenda-report" : activeTab === "clientes" ? "customers" : "customers";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Reportes"
        description="Métricas de rendimiento y analítica"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={exportData.isPending}
              onClick={() => exportData.mutate({ type: exportType, format: "csv" })}
            >
              <ExportIcon className="mr-1.5 size-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exportData.isPending}
              onClick={() => exportData.mutate({ type: exportType, format: "xlsx" })}
            >
              <ExportIcon className="mr-1.5 size-3.5" />
              XLSX
            </Button>
          </div>
        }
      />

      {/* Tab navigation */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "citas" && <AppointmentsTab />}
      {activeTab === "clientes" && <CustomersTab />}
      {activeTab === "conversion" && <ConversionTab />}
      {activeTab === "retencion" && <RetentionTab />}
    </div>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────────────

function DashboardTab() {
  const { data: dashboard, isLoading } = useDashboardMetrics();
  const { data: trendData } = useSalesTrend("month");
  const { data: breakdown } = useSalesBreakdown("category");
  const { data: baPerf = [] } = useBaPerformance();

  const trendChartData = (trendData?.data ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-MX", { month: "short" }),
    ventas: Number(d.totalAmount),
  }));

  const categoryData = (breakdown?.data ?? []).map((d) => ({
    name: d.category ?? "Sin categoría",
    value: Number(d.totalAmount ?? 0),
    color: d.category === "skincare" ? "#4A7C59" : d.category === "makeup" ? "#C9A96E" : "#5B7FA5",
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Clientes totales" value={dashboard?.totalCustomers ?? 0} isLoading={isLoading} />
        <MetricCard
          title="Ventas del mes"
          value={`$${Number(dashboard?.sales?.totalAmount ?? 0).toLocaleString("es-MX")}`}
          subtitle={`${dashboard?.sales?.orderCount ?? 0} transacciones`}
          isLoading={isLoading}
        />
        <MetricCard title="Citas del mes" value={dashboard?.appointments ?? 0} isLoading={isLoading} />
        <MetricCard title="Clientes nuevos" value={dashboard?.newCustomers ?? 0} isLoading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de ventas</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {trendChartData.length > 0 ? (
              <AreaChart
                data={trendChartData}
                xKey="date"
                yKey="ventas"
                yFormatter={(v) => `$${Number(v).toLocaleString("es-MX")}`}
              />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <DonutChart data={categoryData} />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BA Performance table */}
      {Array.isArray(baPerf) && baPerf.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desempeño por BA</CardTitle>
            <CardDescription>Top Beauty Advisors por ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">BA</th>
                    <th className="pb-2 pr-4 font-medium text-right">Ventas</th>
                    <th className="pb-2 pr-4 font-medium text-right">Trans.</th>
                    <th className="pb-2 pr-4 font-medium text-right">Registros</th>
                    <th className="pb-2 pr-4 font-medium text-right">Seguimientos</th>
                    <th className="pb-2 font-medium text-right">Conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {[...baPerf]
                    .sort((a, b) => Number(b.sales.totalAmount) - Number(a.sales.totalAmount))
                    .slice(0, 10)
                    .map((ba) => (
                      <tr key={ba.baId} className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium">{ba.fullName}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          ${Number(ba.sales.totalAmount).toLocaleString("es-MX")}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{ba.sales.orderCount}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{ba.registrations}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{ba.messagesSent}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {(ba.recommendations.conversionRate * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Appointments Tab (RF-28, RF-32) ────────────────────────────────

function AppointmentsTab() {
  const { data: metrics, isLoading: loadingMetrics } = useAppointmentMetrics();
  const { data: byBa } = useAppointmentsByBa();
  const { data: agenda, isLoading: loadingAgenda } = useAgendaReport({ limit: "20" });

  const byBaData = (byBa?.data ?? []).map((row) => ({
    name: row.baName,
    total: row.total,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard title="Total" value={metrics?.total ?? 0} isLoading={loadingMetrics} />
        <MetricCard title="Completadas" value={metrics?.completed ?? 0} isLoading={loadingMetrics} />
        <MetricCard title="Confirmadas" value={metrics?.confirmed ?? 0} isLoading={loadingMetrics} />
        <MetricCard title="Canceladas" value={metrics?.cancelled ?? 0} isLoading={loadingMetrics} />
        <MetricCard title="No asistió" value={metrics?.noShow ?? 0} isLoading={loadingMetrics} />
        <MetricCard title="Reagendadas" value={metrics?.rescheduled ?? 0} isLoading={loadingMetrics} />
      </div>

      {byBaData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Citas por BA</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={byBaData} xKey="name" yKey="total" layout="vertical" height={Math.max(200, byBaData.length * 40)} />
          </CardContent>
        </Card>
      )}

      {/* Agenda report table */}
      <Card>
        <CardHeader>
          <CardTitle>Reporte de agenda</CardTitle>
          <CardDescription>Detalle de citas con información de cliente y BA</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAgenda ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Cliente</th>
                    <th className="pb-2 pr-3 font-medium">Teléfono</th>
                    <th className="pb-2 pr-3 font-medium">BA</th>
                    <th className="pb-2 pr-3 font-medium">Tipo</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {(agenda?.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 tabular-nums">
                        {new Date(row.scheduledAt).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-3">{row.customerName}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.customerPhone ?? "—"}</td>
                      <td className="py-2 pr-3">{row.baName}</td>
                      <td className="py-2 pr-3">{row.eventTypeName ?? row.eventType}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"} size="sm">
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Badge>
                      </td>
                      <td className="py-2 tabular-nums">{row.durationMinutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(agenda?.data ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay citas en el período seleccionado
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Customers Tab (RF-43) ──────────────────────────────────────────

function CustomersTab() {
  const { data: segments = [], isLoading } = useCustomerSegments();

  const segmentData = segments.map((s) => ({
    name: SEGMENT_LABEL[s.segment] ?? s.segment,
    value: s.count,
    color: SEGMENT_COLOR[s.segment] ?? "#6B6B6B",
  }));

  const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total clientes" value={totalCustomers} isLoading={isLoading} />
        {segments.map((s) => (
          <MetricCard
            key={s.segment}
            title={SEGMENT_LABEL[s.segment] ?? s.segment}
            value={s.count}
            isLoading={isLoading}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución por segmento</CardTitle>
        </CardHeader>
        <CardContent>
          {segmentData.length > 0 ? (
            <DonutChart data={segmentData} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Sin datos
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Conversion Tab (RF-47) ─────────────────────────────────────────

function ConversionTab() {
  const { data: conversion, isLoading } = useConversionMetrics(undefined, undefined, true);

  const trendData = (conversion?.trend ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
    tasa: Math.round(d.rate * 100),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Recomendación → Compra"
          value={`${((conversion?.recommendationToSale.rate ?? 0) * 100).toFixed(1)}%`}
          subtitle={`${conversion?.recommendationToSale.converted ?? 0} / ${conversion?.recommendationToSale.total ?? 0}`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Muestra → Compra"
          value={`${((conversion?.sampleToSale.rate ?? 0) * 100).toFixed(1)}%`}
          subtitle={`${conversion?.sampleToSale.converted ?? 0} / ${conversion?.sampleToSale.total ?? 0}`}
          isLoading={isLoading}
        />
      </div>

      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de conversión</CardTitle>
            <CardDescription>Tasa de conversión recomendación → compra por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={trendData}
              xKey="date"
              yKey="tasa"
              yFormatter={(v) => `${v}%`}
              color="#4A7C59"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Retention Tab (RF-48) ──────────────────────────────────────────

function RetentionTab() {
  const { data: retention, isLoading } = useRetention();

  const segmentData = Object.entries(retention?.segments ?? {}).map(([key, count]) => ({
    name: SEGMENT_LABEL[key] ?? key,
    value: count,
    color: SEGMENT_COLOR[key] ?? "#6B6B6B",
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total clientes" value={retention?.total ?? 0} isLoading={isLoading} />
        <MetricCard
          title="Tasa de churn"
          value={`${((retention?.churnRate ?? 0) * 100).toFixed(1)}%`}
          isLoading={isLoading}
        />
        <MetricCard title="En riesgo" value={retention?.segments?.at_risk ?? 0} isLoading={isLoading} />
        <MetricCard title="VIP" value={retention?.segments?.vip ?? 0} isLoading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de retención</CardTitle>
          </CardHeader>
          <CardContent>
            {segmentData.length > 0 ? (
              <DonutChart data={segmentData} />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sin datos
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientas en riesgo</CardTitle>
            <CardDescription>Mayor tiempo sin visita</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Cliente</th>
                      <th className="pb-2 pr-3 font-medium text-right">Días sin compra</th>
                      <th className="pb-2 font-medium">BA asignado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(retention?.atRiskCustomers ?? []).map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2 pr-3">{c.name}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          <Badge variant="warning" size="sm">
                            {c.daysSinceLastPurchase ?? "—"} días
                          </Badge>
                        </td>
                        <td className="py-2">{c.baName ?? "Sin asignar"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(retention?.atRiskCustomers ?? []).length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No hay clientes en riesgo
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────────────────

function MetricCard({
  title,
  value,
  subtitle,
  isLoading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        {isLoading ? (
          <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
        ) : (
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        )}
        {subtitle && !isLoading && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
    </Card>
  );
}

function ExportIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v8M4.5 6.5L8 10l3.5-3.5" />
      <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
    </svg>
  );
}
