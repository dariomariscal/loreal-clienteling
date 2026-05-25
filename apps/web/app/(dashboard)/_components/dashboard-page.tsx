"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useDashboardMetrics,
  useSalesTrend,
  useBaPerformance,
  useAppointmentMetrics,
} from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BaTodayPage } from "./ba-today-page";

const AreaChart = dynamic(
  () => import("@/components/charts/area-chart").then((m) => m.AreaChart),
  { ssr: false },
);

interface DashboardPageProps {
  user: {
    fullName?: string | null;
    role?: string | null;
    storeId?: string | null;
    brandId?: string | null;
    email?: string | null;
  };
}

export function DashboardPage({ user }: DashboardPageProps) {
  const role = user.role ?? "ba";

  // BAs get a Tulip-style "Today" feed — actionable, not analytical.
  // Managers, supervisors and admins keep the KPI dashboard below.
  if (role === "ba") {
    return <BaTodayPage user={user} />;
  }

  const { data: dashboard, isLoading } = useDashboardMetrics();
  const { data: trendData } = useSalesTrend("month");
  const { data: baPerf = [] } = useBaPerformance();
  const { data: apptMetrics } = useAppointmentMetrics();

  const trendChartData = (trendData?.data ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-MX", { month: "short" }),
    ventas: Number(d.totalAmount),
  }));

  const [greeting, setGreeting] = React.useState("");
  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {greeting}, {user.fullName?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {role === "manager" && "Resumen de tu tienda"}
          {role === "supervisor" && "Resumen de tu zona y marca"}
          {role === "admin" && "Resumen nacional"}
        </p>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas del mes"
          value={`$${Number(dashboard?.sales?.totalAmount ?? 0).toLocaleString("es-MX")}`}
          detail={`${dashboard?.sales?.transactionCount ?? 0} transacciones`}
          isLoading={isLoading}
        />
        <KpiCard
          label="Clientes totales"
          value={dashboard?.totalCustomers ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          label="Clientes nuevos"
          value={dashboard?.newCustomers ?? 0}
          detail="Este mes"
          isLoading={isLoading}
        />
        <KpiCard
          label="Citas del mes"
          value={dashboard?.appointments ?? 0}
          detail={apptMetrics ? `${apptMetrics.completed} completadas` : undefined}
          isLoading={isLoading}
        />
      </div>

      {/* Sales trend chart */}
      {trendChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de ventas</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={trendChartData}
              xKey="date"
              yKey="ventas"
              yFormatter={(v) => `$${Number(v).toLocaleString("es-MX")}`}
              height={240}
            />
          </CardContent>
        </Card>
      )}

      {/* BA Leaderboard — visible for manager, supervisor, admin */}
      {Array.isArray(baPerf) && baPerf.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Beauty Advisors</CardTitle>
              <CardDescription>Por ventas del mes</CardDescription>
            </div>
            <Link
              href="/reportes"
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Ver todo →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">BA</th>
                    <th className="pb-2 pr-4 font-medium text-right">Ventas</th>
                    <th className="pb-2 pr-4 font-medium text-right">Trans.</th>
                    <th className="pb-2 font-medium text-right">Conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {[...baPerf]
                    .sort((a, b) => Number(b.sales.totalAmount) - Number(a.sales.totalAmount))
                    .slice(0, 5)
                    .map((ba, i) => (
                      <tr key={ba.baId} className="border-b border-border/50">
                        <td className="py-2.5 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium">{ba.fullName}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          ${Number(ba.sales.totalAmount).toLocaleString("es-MX")}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {ba.sales.transactionCount}
                        </td>
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

function KpiCard({
  label,
  value,
  detail,
  isLoading,
}: {
  label: string;
  value: string | number;
  detail?: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        ) : (
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        )}
        {detail && !isLoading && (
          <p className="text-xs text-muted-foreground">{detail}</p>
        )}
      </CardHeader>
    </Card>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}
