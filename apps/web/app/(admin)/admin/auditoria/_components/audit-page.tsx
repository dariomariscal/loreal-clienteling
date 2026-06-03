"use client";

import { useState } from "react";
import { useAuditLogs, type AuditLogFilters } from "@/lib/hooks";
import { AUDIT_ACTIONS } from "@loreal/contracts";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { AuditLog } from "@/lib/hooks/use-audit-logs";

const ACTION_LABEL: Record<string, string> = {
  customer_viewed: "Cliente visto",
  customer_exported: "Cliente exportado",
  customer_deleted_arco_request: "ARCO eliminado",
  consent_granted: "Consentimiento otorgado",
  consent_revoked: "Consentimiento revocado",
  user_login: "Login",
  user_logout: "Logout",
  user_login_failed: "Login fallido",
  role_changed: "Rol cambiado",
  user_created: "Usuario creado",
  user_updated: "Usuario actualizado",
  user_deactivated: "Usuario desactivado",
  user_activated: "Usuario activado",
  ai_recommendation_requested: "IA solicitada",
  sync_conflict_resolved: "Conflicto sync",
};

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters: AuditLogFilters = {
    page: String(page),
    limit: "25",
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  const { data: logs = [], isLoading } = useAuditLogs(filters);

  const columns: Column<AuditLog>[] = [
    {
      key: "timestamp",
      label: "Fecha",
      render: (v) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatTimestamp(v as string)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Acción",
      render: (v) => (
        <Badge variant="secondary" size="sm">
          {ACTION_LABEL[v as string] ?? (v as string)}
        </Badge>
      ),
    },
    { key: "entityType", label: "Entidad" },
    {
      key: "entityId",
      label: "ID",
      className: "font-mono text-xs",
      render: (v) => (v as string)?.slice(0, 8) + "…",
    },
    {
      key: "actorUserId",
      label: "Actor",
      className: "font-mono text-xs",
      render: (v) => v ? (v as string).slice(0, 8) + "…" : "Sistema",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de acciones sensibles (LFPDPPP)"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Acción</Label>
          <Select value={action} onValueChange={(v) => { setAction(v as string); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas">
                {action ? ACTION_LABEL[action] ?? action : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABEL[a] ?? a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Entidad</Label>
          <Input
            placeholder="customer, consent..."
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-36" />
        </div>
      </div>

      <DataTable columns={columns} data={logs} isLoading={isLoading} emptyTitle="No hay registros" />

      <Pagination page={page} totalPages={logs.length === 25 ? page + 1 : page} onPageChange={setPage} />
    </div>
  );
}
