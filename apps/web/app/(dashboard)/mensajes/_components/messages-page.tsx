"use client";

import { useState } from "react";
import {
  useMessages,
  useCreateMessage,
  type Message,
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
import type { MessageFormData } from "./message-form";
import { MessageForm } from "./message-form";

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

const CAMPAIGN_LABEL: Record<string, string> = {
  birthday: "Cumpleaños",
  replenishment: "Reposición",
  win_back: "Recuperación",
  new_launch: "Nuevo lanzamiento",
  post_purchase: "Post-compra",
  appointment_reminder: "Recordatorio de cita",
  abandoned_cart: "Carrito abandonado",
  special_event: "Evento especial",
  manual: "Manual",
  custom: "Personalizado",
};

// ── Types ──────────────────────────────────────────────────────────

type DialogState = null | "create" | { mode: "detail"; message: Message };

// ── Component ──────────────────────────────────────────────────────

interface MessagesPageProps {
  user: { role?: string | null };
}

export function MessagesPage({ user }: MessagesPageProps) {
  const role = user.role ?? "beauty_advisor";
  const { data: messages = [], isLoading } = useMessages();
  const createMessage = useCreateMessage();
  const [dialog, setDialog] = useState<DialogState>(null);

  const columns: Column<Message>[] = [
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
      key: "campaignType",
      label: "Tipo",
      render: (v) => (
        <Badge variant="secondary" size="sm">
          {CAMPAIGN_LABEL[v as string] ?? (v as string)}
        </Badge>
      ),
    },
    {
      key: "deliveredAt",
      label: "Estado",
      render: (_: unknown, row: Message) => {
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

  function handleCreate(data: MessageFormData) {
    createMessage.mutate(data as any, {
      onSuccess: () => setDialog(null),
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Mensajes"
        description="Mensajes con clientas"
        action={
          can(role, "communication.create") ? (
            <Button onClick={() => setDialog("create")}>
              Nuevo mensaje
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={messages}
        isLoading={isLoading}
        onRowClick={(row) =>
          setDialog({ mode: "detail", message: row })
        }
        emptyTitle="Sin mensajes"
        emptyDescription="No hay mensajes registrados"
      />

      {/* Create Dialog */}
      <Dialog
        open={dialog === "create"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nuevo mensaje</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <MessageForm
              onSubmit={handleCreate}
              isPending={createMessage.isPending}
            />
          </DialogBody>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" disabled={createMessage.isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="message-form"
              disabled={createMessage.isPending}
            >
              {createMessage.isPending ? "Enviando..." : "Enviar"}
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
                        CHANNEL_VARIANT[dialog.message.channel] ?? "secondary"
                      }
                    >
                      {CHANNEL_LABEL[dialog.message.channel] ??
                        dialog.message.channel}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd>
                    {dialog.message.campaignType
                      ? (CAMPAIGN_LABEL[dialog.message.campaignType] ??
                        dialog.message.campaignType)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Enviado</dt>
                  <dd>
                    {new Date(dialog.message.sentAt).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                {dialog.message.subject && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">Asunto</dt>
                    <dd className="font-medium">{dialog.message.subject}</dd>
                  </div>
                )}
                <div>
                  <dt className="mb-1 text-muted-foreground">Mensaje</dt>
                  <dd className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                    {dialog.message.body}
                  </dd>
                </div>
                <div className="border-t border-border/60 pt-3">
                  <dt className="mb-2 text-muted-foreground">Tracking</dt>
                  <dd className="flex flex-wrap gap-2">
                    <Badge variant="secondary" size="sm">
                      Enviado
                    </Badge>
                    {dialog.message.deliveredAt && (
                      <Badge variant="default" size="sm">
                        Entregado
                      </Badge>
                    )}
                    {dialog.message.readAt && (
                      <Badge variant="info" size="sm">
                        Leído
                      </Badge>
                    )}
                    {dialog.message.respondedAt && (
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
