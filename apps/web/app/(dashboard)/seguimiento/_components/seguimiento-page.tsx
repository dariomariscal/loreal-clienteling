"use client";

import { useState } from "react";
import {
  useCommunications,
  useCreateCommunication,
  type Communication,
} from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { CommunicationFormData } from "./communication-form";
import { CommunicationForm } from "./communication-form";

// ── Label maps ─────────────────────────────────────────────────────

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

const CHANNEL_VARIANT: Record<string, "default" | "info" | "success"> = {
  whatsapp: "success",
  sms: "default",
  email: "info",
};

const FOLLOWUP_LABEL: Record<string, string> = {
  "3_months": "3 meses",
  "6_months": "6 meses",
  birthday: "Cumpleaños",
  replenishment: "Reposición",
  special_event: "Evento especial",
  custom: "Personalizado",
};

// ── Types ──────────────────────────────────────────────────────────

type DialogState = null | "create" | { mode: "detail"; comm: Communication };

// ── Component ──────────────────────────────────────────────────────

interface SeguimientoPageProps {
  user: { role?: string | null };
}

export function SeguimientoPage({ user }: SeguimientoPageProps) {
  const role = user.role ?? "ba";
  const { data: comms = [], isLoading } = useCommunications();
  const createComm = useCreateCommunication();
  const [dialog, setDialog] = useState<DialogState>(null);

  const columns: Column<Communication>[] = [
    {
      key: "sentAt",
      label: "Fecha",
      render: (v) =>
        new Date(v as string).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
    {
      key: "channel",
      label: "Canal",
      render: (v) => {
        const ch = v as string;
        return (
          <Badge variant={CHANNEL_VARIANT[ch] ?? "secondary"} size="sm">
            {CHANNEL_LABEL[ch] ?? ch}
          </Badge>
        );
      },
    },
    {
      key: "followupType",
      label: "Tipo",
      render: (v) => (
        <Badge variant="secondary" size="sm">
          {FOLLOWUP_LABEL[v as string] ?? (v as string)}
        </Badge>
      ),
    },
    {
      key: "deliveredAt",
      label: "Estado",
      render: (_: unknown, row: Communication) => {
        if (row.respondedAt)
          return (
            <Badge variant="success" size="sm">
              Respondido
            </Badge>
          );
        if (row.readAt)
          return (
            <Badge variant="info" size="sm">
              Leído
            </Badge>
          );
        if (row.deliveredAt)
          return (
            <Badge variant="default" size="sm">
              Entregado
            </Badge>
          );
        return (
          <Badge variant="secondary" size="sm">
            Enviado
          </Badge>
        );
      },
    },
  ];

  function handleCreate(data: CommunicationFormData) {
    createComm.mutate(data as any, {
      onSuccess: () => setDialog(null),
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Seguimiento"
        description="Comunicaciones y seguimiento de clientas"
        action={
          can(role, "communication.create") ? (
            <Button onClick={() => setDialog("create")}>
              Nuevo seguimiento
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={comms}
        isLoading={isLoading}
        onRowClick={(row) =>
          setDialog({ mode: "detail", comm: row })
        }
        emptyTitle="Sin seguimientos"
        emptyDescription="No hay comunicaciones registradas"
      />

      {/* Create Dialog */}
      <Dialog
        open={dialog === "create"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nuevo seguimiento</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <CommunicationForm
              onSubmit={handleCreate}
              isPending={createComm.isPending}
            />
          </DialogBody>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" disabled={createComm.isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="communication-form"
              disabled={createComm.isPending}
            >
              {createComm.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={dialog !== null && dialog !== "create" && typeof dialog === "object" && dialog.mode === "detail"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del mensaje</DialogTitle>
          </DialogHeader>
          {dialog !== null && dialog !== "create" && typeof dialog === "object" && dialog.mode === "detail" && (
            <DialogBody>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Canal</dt>
                  <dd>
                    <Badge
                      variant={
                        CHANNEL_VARIANT[dialog.comm.channel] ?? "secondary"
                      }
                    >
                      {CHANNEL_LABEL[dialog.comm.channel] ??
                        dialog.comm.channel}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd>
                    {dialog.comm.followupType
                      ? (FOLLOWUP_LABEL[dialog.comm.followupType] ??
                        dialog.comm.followupType)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Enviado</dt>
                  <dd>
                    {new Date(dialog.comm.sentAt).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                {dialog.comm.subject && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">Asunto</dt>
                    <dd className="font-medium">{dialog.comm.subject}</dd>
                  </div>
                )}
                <div>
                  <dt className="mb-1 text-muted-foreground">Mensaje</dt>
                  <dd className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                    {dialog.comm.body}
                  </dd>
                </div>
                <div className="border-t border-border/60 pt-3">
                  <dt className="mb-2 text-muted-foreground">Tracking</dt>
                  <dd className="flex flex-wrap gap-2">
                    <Badge variant="secondary" size="sm">
                      Enviado
                    </Badge>
                    {dialog.comm.deliveredAt && (
                      <Badge variant="default" size="sm">
                        Entregado
                      </Badge>
                    )}
                    {dialog.comm.readAt && (
                      <Badge variant="info" size="sm">
                        Leído
                      </Badge>
                    )}
                    {dialog.comm.respondedAt && (
                      <Badge variant="success" size="sm">
                        Respondido
                      </Badge>
                    )}
                  </dd>
                </div>
              </dl>
            </DialogBody>
          )}
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
