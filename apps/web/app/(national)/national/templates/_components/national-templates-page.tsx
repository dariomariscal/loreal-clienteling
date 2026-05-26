"use client";

import * as React from "react";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { TemplateGlyph, PlusGlyph } from "@/components/ui/glyphs";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  type MessageTemplate,
} from "@/lib/hooks/use-templates";
import { useBrands, type Brand } from "@/lib/hooks/use-brands";
import {
  DevicePreview,
  type PreviewChannel,
} from "@/components/manager/device-preview";
import { cn } from "@/lib/utils";

const CHANNELS: { value: PreviewChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

const CAMPAIGN_TYPES = [
  { value: "win_back", label: "Reactivar" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "vip_cadence", label: "VIP" },
  { value: "replenishment", label: "Reabastecimiento" },
  { value: "new_product", label: "Producto nuevo" },
  { value: "post_purchase", label: "Post-compra" },
  { value: "appointment_reminder", label: "Recordatorio cita" },
  { value: "general", label: "General" },
];

/**
 * NRM template manager. Two-column shell:
 *   - Left: list of templates, filterable by brand + channel chips.
 *   - Right: form (top) + DevicePreview (right column, sticky on lg+) so
 *     the NRM sees the rendered version of the body as they type.
 *
 * "Nueva plantilla" appears as a fresh-form mode the user enters by
 * clicking "+ Nueva" at the top of the list — the right pane swaps from
 * "edit existing" to "create new" with the same UI shape.
 */
export function NationalTemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const { data: brands } = useBrands();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [brandFilter, setBrandFilter] = React.useState<string>("__all__");
  const [channelFilter, setChannelFilter] = React.useState<string>("__all__");

  const filtered = React.useMemo(() => {
    let rows = templates ?? [];
    if (brandFilter !== "__all__") {
      rows = rows.filter((t) =>
        brandFilter === "__global__"
          ? t.brandId == null
          : t.brandId === brandFilter,
      );
    }
    if (channelFilter !== "__all__") {
      rows = rows.filter((t) => t.channel === channelFilter);
    }
    return rows;
  }, [templates, brandFilter, channelFilter]);

  React.useEffect(() => {
    if (!selectedId && !creating && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId, creating]);

  const selected = templates?.find((t) => t.id === selectedId) ?? null;

  return (
    <ThreeColumnLayout
      list={
        <div className="flex h-full flex-col">
          <div className="space-y-3 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-heading)] text-base font-medium tracking-tight">
                Plantillas
              </h2>
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => {
                  setCreating(true);
                  setSelectedId(null);
                }}
              >
                <PlusGlyph className="size-4" />
                Nueva
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Select
                value={brandFilter}
                onValueChange={(v) => setBrandFilter(v ?? "__all__")}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las marcas</SelectItem>
                  <SelectItem value="__global__">Globales</SelectItem>
                  {(brands ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={channelFilter}
                onValueChange={(v) => setChannelFilter(v ?? "__all__")}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los canales</SelectItem>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <AdvisorEmptyState
                icon={<TemplateGlyph className="size-6" />}
                title="Sin plantillas"
                description="Crea una nueva con el botón superior."
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {filtered.map((t) => (
                  <li key={t.id}>
                    <TemplateListItem
                      template={t}
                      brands={brands ?? []}
                      active={selectedId === t.id && !creating}
                      onClick={() => {
                        setCreating(false);
                        setSelectedId(t.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      }
      detail={
        creating ? (
          <TemplateEditor
            mode="create"
            initial={null}
            brands={brands ?? []}
            onSaved={(t) => {
              setCreating(false);
              setSelectedId(t.id);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : selected ? (
          <TemplateEditor
            mode="edit"
            initial={selected}
            brands={brands ?? []}
            onSaved={() => {
              /* the list re-renders via React Query invalidate */
            }}
            onCancel={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Elige una plantilla a la izquierda o crea una nueva.
          </div>
        )
      }
    />
  );
}

// ── List ───────────────────────────────────────────────────────────────────

function TemplateListItem({
  template,
  brands,
  active,
  onClick,
}: {
  template: MessageTemplate;
  brands: Brand[];
  active: boolean;
  onClick: () => void;
}) {
  const brand = brands.find((b) => b.id === template.brandId);
  const accent = brand?.accentColor ?? brand?.primaryColor ?? null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-foreground/15 bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))]"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 size-2 shrink-0 rounded-full"
        style={{ backgroundColor: accent ?? "var(--muted-foreground)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {template.name}
          </p>
          {!template.isActive ? (
            <Badge variant="outline" className="text-[9px] uppercase">
              Inactivo
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {brand?.displayName ?? "Global"} · {channelLabel(template.channel)} ·{" "}
          {template.campaignType}
        </p>
      </div>
    </button>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-1">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="rounded-lg border border-transparent p-3">
          <div className="space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function channelLabel(channel: string): string {
  const found = CHANNELS.find((c) => c.value === channel);
  return found?.label ?? channel;
}

// ── Editor ─────────────────────────────────────────────────────────────────

interface EditorProps {
  mode: "create" | "edit";
  initial: MessageTemplate | null;
  brands: Brand[];
  onSaved: (t: MessageTemplate) => void;
  onCancel: () => void;
}

function TemplateEditor({ mode, initial, brands, onSaved, onCancel }: EditorProps) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const isSaving = create.isPending || update.isPending;

  const [form, setForm] = React.useState<FormState>(() => initialForm(initial));
  React.useEffect(() => {
    setForm(initialForm(initial));
  }, [initial?.id]);

  const selectedBrand = brands.find((b) => b.id === form.brandId) ?? null;

  async function handleSave() {
    if (mode === "create") {
      const created = await create.mutateAsync({
        brandId: form.brandId || undefined,
        name: form.name,
        channel: form.channel,
        body: form.body,
        campaignType: form.campaignType,
      });
      onSaved(created);
      return;
    }
    if (initial) {
      const updated = await update.mutateAsync({
        id: initial.id,
        name: form.name,
        channel: form.channel,
        body: form.body,
        campaignType: form.campaignType,
        isActive: form.isActive,
      });
      onSaved(updated);
    }
  }

  const canSave = form.name.trim().length > 0 && form.body.trim().length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-6 py-4 lg:px-10">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-heading)] text-2xl tracking-tight text-foreground">
            {mode === "create" ? "Nueva plantilla" : initial?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === "create"
              ? "Configura una nueva plantilla y guárdala."
              : "Edita el contenido y guarda los cambios."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} className="h-10">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="h-10"
          >
            {isSaving ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre interno" htmlFor="tpl-name">
                <Input
                  id="tpl-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="VIP — recordatorio mensual"
                />
              </Field>
              <Field label="Tipo de campaña" htmlFor="tpl-campaign">
                <Select
                  value={form.campaignType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      campaignType: v ?? f.campaignType,
                    }))
                  }
                >
                  <SelectTrigger id="tpl-campaign" className="w-full">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Marca" htmlFor="tpl-brand">
                <Select
                  value={form.brandId ?? "__global__"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      brandId: v === "__global__" ? null : (v ?? null),
                    }))
                  }
                >
                  <SelectTrigger id="tpl-brand" className="w-full">
                    <SelectValue placeholder="Global (sin marca)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__global__">Global (sin marca)</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Canal" htmlFor="tpl-channel">
                <div role="tablist" className="flex gap-1.5">
                  {CHANNELS.map((c) => {
                    const active = form.channel === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() =>
                          setForm((f) => ({ ...f, channel: c.value }))
                        }
                        className={
                          active
                            ? "rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                            : "rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/40"
                        }
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            <Field label="Cuerpo del mensaje" htmlFor="tpl-body">
              <Textarea
                id="tpl-body"
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Hola {{firstName}}, queremos invitarte a…"
                rows={8}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Usa <code className="rounded bg-muted px-1">{"{{firstName}}"}</code>,{" "}
                <code className="rounded bg-muted px-1">{"{{loyaltyTier}}"}</code>,{" "}
                <code className="rounded bg-muted px-1">{"{{storeName}}"}</code>{" "}
                — se reemplazan al enviar.
              </p>
            </Field>

            {mode === "edit" ? (
              <Field label="Estado" htmlFor="tpl-active">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, isActive: !f.isActive }))
                  }
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium",
                    form.isActive
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={
                      form.isActive ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground/50"
                    }
                  />
                  {form.isActive ? "Activa" : "Inactiva"}
                </button>
              </Field>
            ) : null}
          </section>

          <aside className="lg:sticky lg:top-0">
            <DevicePreview
              channel={form.channel}
              body={form.body}
              senderName={selectedBrand?.displayName ?? "L'Oréal"}
              subject={
                form.channel === "email" ? form.name || "Mensaje" : undefined
              }
              brandPrimary={selectedBrand?.primaryColor ?? null}
              brandAccent={selectedBrand?.accentColor ?? null}
              brandLogoUrl={selectedBrand?.logoUrl ?? null}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Bits ───────────────────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

interface FormState {
  name: string;
  body: string;
  channel: PreviewChannel;
  campaignType: string;
  brandId: string | null;
  isActive: boolean;
}

function initialForm(t: MessageTemplate | null): FormState {
  if (!t) {
    return {
      name: "",
      body: "",
      channel: "whatsapp",
      campaignType: "general",
      brandId: null,
      isActive: true,
    };
  }
  return {
    name: t.name,
    body: t.body,
    channel: (t.channel as PreviewChannel) ?? "whatsapp",
    campaignType: t.campaignType,
    brandId: t.brandId,
    isActive: t.isActive,
  };
}
