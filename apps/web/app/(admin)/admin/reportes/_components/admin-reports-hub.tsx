"use client";

import Link from "next/link";
import { ReportShell } from "@/components/reports";
import {
  AppointmentGlyph,
  SparkleDotGlyph,
  StoreGlyph,
  TeamGlyph,
  PulseGlyph,
  ZonesGlyph,
} from "@/components/ui/glyphs";

interface ReportLink {
  href: string;
  title: string;
  description: string;
  icon: typeof PulseGlyph;
}

const REPORTS: ReportLink[] = [
  {
    href: "/admin/reportes/dashboard",
    title: "Dashboard ejecutivo",
    description: "Objetivo, sell-out, transacciones, registros y seguimientos",
    icon: PulseGlyph,
  },
  {
    href: "/admin/reportes/appointments",
    title: "Métricas de citas",
    description: "Objetivo semanal, totales, nuevas y reagendadas",
    icon: AppointmentGlyph,
  },
  {
    href: "/admin/reportes/customers",
    title: "Reporte de clientes",
    description: "Listado exportable con último BA y tipo de seguimiento",
    icon: SparkleDotGlyph,
  },
  {
    href: "/admin/reportes/franchises",
    title: "Top Franquicias y Marcas",
    description: "Rankings + ventas por categoría",
    icon: StoreGlyph,
  },
  {
    href: "/admin/reportes/performance",
    title: "Desempeño por BA",
    description: "Transacciones, registros, seguimientos, recomendaciones",
    icon: TeamGlyph,
  },
  {
    href: "/admin/reportes/zones",
    title: "Comparativa entre zonas",
    description: "Ranking cross-zona del país",
    icon: ZonesGlyph,
  },
];

/**
 * Admin reports hub — landing page that links to each of the 6 reports with
 * national scope. Each sub-route reuses the corresponding NRM component since
 * an admin has the same (or wider) visibility.
 */
export function AdminReportsHub() {
  return (
    <ReportShell
      title="Reportes"
      description="Reportes ejecutivos con visibilidad nacional"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-px hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="size-4" />
                </span>
                <h2 className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">
                  {r.title}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">{r.description}</p>
              <span className="mt-auto pt-2 text-sm font-medium text-foreground/80 group-hover:text-foreground">
                Abrir reporte →
              </span>
            </Link>
          );
        })}
      </div>
    </ReportShell>
  );
}
