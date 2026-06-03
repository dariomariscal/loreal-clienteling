"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { ReportShell } from "@/components/reports/report-shell";
import { DataTableShell, type SavedView } from "@/components/reports/data-table-shell";
import { CustomerDetailPanel } from "@/components/reports/panels/customer-detail-panel";
import { useReportSidePanel } from "@/components/reports/report-side-panel";
import { ExportToolbar } from "@/components/reports/export-toolbar";
import { useCustomerExportPreview } from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";
import type { CustomerExportRow } from "@loreal/contracts";

interface CustomersReportProps {
  /** Role label — drives which filter slots render in the filter bar. */
  role: "counter_manager" | "area_manager" | "national_retail_manager" | "admin";
  /** Filter bar — pre-composed by the caller with the entity dropdowns the role needs. */
  filterBar: React.ReactNode;
  /** Title shown in the report header. */
  title?: string;
  /** Description under the title. */
  description?: string;
}

/**
 * Report 4 — Exportable client list. Shared component used by every role's
 * customers page. The role-specific wrapper supplies the FilterBar; this
 * component owns the table, search, saved views, selection, pagination, and
 * export modal.
 */
export function CustomersReport({
  role,
  filterBar,
  title = "Clientes",
  description = "Listado exportable de clientes en tu alcance",
}: CustomersReportProps) {
  const { filters } = useFilters();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [viewId, setViewId] = React.useState<string>("all");

  const { data, isLoading } = useCustomerExportPreview(filters);

  const { open } = useReportSidePanel("customerId");

  const filtered = React.useMemo(
    () => applyViewAndSearch(data ?? [], viewId, search),
    [data, viewId, search],
  );

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <>
      <ReportShell
        title={title}
        description={description}
        filters={filterBar}
        toolbar={
          <ExportToolbar
            type="customers"
            disabled={filtered.length === 0}
          />
        }
      >
        <DataTableShell
          summary={`${filtered.length.toLocaleString("es-MX")} clientes`}
          search={
            <Input
              type="search"
              placeholder="Buscar nombre, teléfono o email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-72"
            />
          }
          views={SAVED_VIEWS}
          activeViewId={viewId}
          onViewChange={(id) => {
            setViewId(id);
            setPage(1);
          }}
          bulkActions={
            selected.size > 0 ? (
              <>
                <span className="text-sm font-medium">
                  {selected.size} seleccionados
                </span>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Limpiar
                </Button>
              </>
            ) : null
          }
        >
          <CustomersTable
            rows={pageRows}
            selected={selected}
            onToggle={toggleRow}
            onOpen={open}
            isLoading={isLoading}
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </DataTableShell>
      </ReportShell>

      <CustomerDetailPanel />
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "Todos" },
  { id: "with_overdue", label: "Con seguimiento vencido" },
  { id: "no_contact_60d", label: "Sin contacto 60d" },
  { id: "vip", label: "VIPs" },
];

function applyViewAndSearch(
  rows: CustomerExportRow[],
  viewId: string,
  search: string,
): CustomerExportRow[] {
  const term = search.trim().toLowerCase();

  let out = rows;
  if (viewId === "with_overdue") {
    out = out.filter((r) => r.overdueFollowUpCount > 0);
  } else if (viewId === "vip") {
    out = out.filter((r) => (r.loyaltyTier ?? "").toLowerCase() === "vip");
  } else if (viewId === "no_contact_60d") {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    out = out.filter((r) => {
      if (!r.lastContactAt) return true;
      return new Date(r.lastContactAt).getTime() < cutoff;
    });
  }

  if (term) {
    out = out.filter((r) => {
      const name = `${r.firstName} ${r.lastName}`.toLowerCase();
      return (
        name.includes(term) ||
        (r.phone ?? "").toLowerCase().includes(term) ||
        (r.email ?? "").toLowerCase().includes(term)
      );
    });
  }
  return out;
}

function CustomersTable({
  rows,
  selected,
  onToggle,
  onOpen,
  isLoading,
}: {
  rows: CustomerExportRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        Sin clientes que coincidan con los filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <th className="w-10 px-3 py-2" />
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2">Teléfono</th>
            <th className="px-3 py-2">Último BA</th>
            <th className="px-3 py-2">Cliente desde</th>
            <th className="px-3 py-2">Último contacto</th>
            <th className="px-3 py-2">Tipo de seguimiento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.customerId}
              className="border-b border-border/60 transition-colors hover:bg-muted/50"
            >
              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(row.customerId)}
                  onChange={() => onToggle(row.customerId)}
                  className="size-4 rounded border-border"
                  aria-label={`Seleccionar ${row.firstName} ${row.lastName}`}
                />
              </td>
              <td
                role="button"
                tabIndex={0}
                onClick={() => onOpen(row.customerId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(row.customerId);
                  }
                }}
                className="cursor-pointer px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <CustomerAvatar firstName={row.firstName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {row.email ?? "—"}
                    </p>
                  </div>
                  {row.loyaltyTier ? (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {row.loyaltyTier}
                    </Badge>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-2 tabular-nums text-foreground">
                {row.phone ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground">
                {row.lastBaName ?? "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatDate(row.customerSince)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatDate(row.lastContactAt)}
              </td>
              <td className="px-3 py-2">
                {row.nextFollowUpType ? (
                  <Badge variant="secondary">{row.nextFollowUpType}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
