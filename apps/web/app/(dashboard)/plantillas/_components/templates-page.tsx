"use client";

import { useState } from "react";
import { useTemplates, useBrands, useCreateTemplate, useUpdateTemplate, type MessageTemplate } from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import type { CreateTemplate } from "@loreal/contracts";
import { TemplateForm } from "./template-form";

type DialogState = null | { mode: "create" } | { mode: "edit"; template: MessageTemplate };

const CHANNEL_LABEL: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" };
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

interface TemplatesPageProps {
  user: { role?: string | null };
}

export function TemplatesPage({ user }: TemplatesPageProps) {
  const role = user.role ?? "ba";
  const { data: templates = [], isLoading } = useTemplates();
  const { data: brands = [] } = useBrands();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const [dialog, setDialog] = useState<DialogState>(null);

  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.displayName]));

  const columns: Column<MessageTemplate>[] = [
    { key: "name", label: "Nombre" },
    {
      key: "channel",
      label: "Canal",
      render: (v) => <Badge variant="info">{CHANNEL_LABEL[v as string] ?? (v as string)}</Badge>,
    },
    {
      key: "campaignType",
      label: "Tipo",
      render: (v) => <Badge variant="secondary">{CAMPAIGN_LABEL[v as string] ?? (v as string)}</Badge>,
    },
    {
      key: "brandId",
      label: "Marca",
      render: (v) => v ? brandMap[v as string] ?? "—" : "Global",
    },
    {
      key: "active",
      label: "Estado",
      render: (v) => <Badge variant={v ? "success" : "destructive"} size="sm">{v ? "Activa" : "Inactiva"}</Badge>,
    },
    ...(can(role, "template.manage")
      ? [{
          key: "actions" as const,
          label: "",
          className: "w-10",
          render: (_: unknown, row: MessageTemplate) => (
            <Button variant="ghost" size="icon-xs" onClick={() => setDialog({ mode: "edit", template: row })}>
              <EditIcon className="size-3.5" />
            </Button>
          ),
        }]
      : []),
  ];

  function handleSubmit(data: CreateTemplate) {
    if (dialog?.mode === "edit") {
      updateTemplate.mutate({ id: dialog.template.id, ...data }, { onSuccess: () => setDialog(null) });
    } else {
      createTemplate.mutate(data, { onSuccess: () => setDialog(null) });
    }
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Plantillas"
        description="Plantillas de mensajes por marca y tipo"
        action={
          can(role, "template.manage") ? (
            <Button onClick={() => setDialog({ mode: "create" })}>Nueva plantilla</Button>
          ) : undefined
        }
      />

      <DataTable columns={columns} data={templates} isLoading={isLoading} emptyTitle="No hay plantillas" />

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <TemplateForm
              defaultValues={dialog?.mode === "edit" ? (dialog.template as unknown as Record<string, unknown>) : undefined}
              brands={brands}
              onSubmit={handleSubmit}
              isPending={isPending}
            />
          </DialogBody>
          <DialogFooter>
            <DialogClose><Button variant="outline" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" form="template-form" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
    </svg>
  );
}
