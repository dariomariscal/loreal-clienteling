"use client";

import * as React from "react";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import {
  SegmentGlyph,
  PlusGlyph,
  CheckCircleGlyph,
  CloseGlyph,
} from "@/components/ui/glyphs";
import {
  useSegments,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  usePreviewSegment,
  type CustomerSegment,
  type SegmentFilter,
  type SegmentCustomer,
} from "@/lib/hooks/use-segments";
import {
  LIFECYCLE_STAGES,
  LOYALTY_TIERS,
} from "@/lib/schemas/segments";
import { cn } from "@/lib/utils";
import { formatCompactMoney } from "@/components/manager/format";

type SegmentScope = "personal" | "brand" | "division" | "global";

const SCOPE_LABEL: Record<SegmentScope, string> = {
  personal: "Personal",
  brand: "Marca",
  division: "División",
  global: "Global",
};

const SCOPE_HINT: Record<SegmentScope, string> = {
  personal: "Solo tú lo ves.",
  brand: "Compartido con la marca asignada.",
  division: "Compartido con toda tu división.",
  global: "Visible a toda la organización.",
};

const LIFECYCLE_LABEL: Record<(typeof LIFECYCLE_STAGES)[number], string> = {
  new: "Nueva",
  returning: "Recurrente",
  vip: "VIP",
  at_risk: "En riesgo",
  dormant: "Dormida",
};

/**
 * NRM segment builder.
 *
 * The backend filter schema is intentionally flat (no nested AND/OR — see
 * `segmentFilterSchema`), so the UI does NOT pretend to be a visual rule
 * tree. Instead it groups predicates by semantic category (lifecycle,
 * loyalty, recency, behavior) — Customer.io / Klaviyo's approach when
 * filters are flat. Each section maps directly to fields on the filter
 * object, so what the NRM picks IS what the server runs.
 *
 * Live preview (count + first 20 customers) fires via `usePreviewSegment`
 * on a 500ms debounce — the "wow" feature of every modern segment builder.
 */
export function NationalSegmentsPage() {
  const { data: segments, isLoading } = useSegments();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    if (!selectedId && !creating && segments && segments.length > 0) {
      setSelectedId(segments[0].id);
    }
  }, [segments, selectedId, creating]);

  const selected = segments?.find((s) => s.id === selectedId) ?? null;

  return (
    <ThreeColumnLayout
      list={
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-heading)] text-base font-medium tracking-tight">
                Segmentos
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
                Nuevo
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {segments?.length ?? 0}{" "}
              {segments?.length === 1 ? "segmento" : "segmentos"} disponibles
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <ListSkeleton />
            ) : !segments || segments.length === 0 ? (
              <AdvisorEmptyState
                icon={<SegmentGlyph className="size-6" />}
                title="Sin segmentos aún"
                description="Crea el primero con el botón superior."
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {segments.map((s) => (
                  <li key={s.id}>
                    <SegmentListItem
                      segment={s}
                      active={selectedId === s.id && !creating}
                      onClick={() => {
                        setCreating(false);
                        setSelectedId(s.id);
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
          <SegmentEditor
            mode="create"
            initial={null}
            onSaved={(s) => {
              setCreating(false);
              setSelectedId(s.id);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : selected ? (
          <SegmentEditor
            mode="edit"
            initial={selected}
            onSaved={() => undefined}
            onCancel={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Selecciona un segmento o crea uno nuevo para empezar.
          </div>
        )
      }
    />
  );
}

// ── List ───────────────────────────────────────────────────────────────────

function SegmentListItem({
  segment,
  active,
  onClick,
}: {
  segment: CustomerSegment;
  active: boolean;
  onClick: () => void;
}) {
  const scope = inferScope(segment);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-foreground/15 bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))]"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      <SegmentGlyph className="mt-0.5 size-4 text-[color:var(--ba-accent)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {segment.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {segment.description ?? "Sin descripción"}
        </p>
        <div className="mt-1.5 flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
            {SCOPE_LABEL[scope]}
          </Badge>
          {segment.isDynamic ? (
            <Badge variant="outline" className="text-[9px] uppercase">
              Dinámico
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-1">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="space-y-2 rounded-lg border border-transparent p-3"
        >
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

function inferScope(segment: CustomerSegment): SegmentScope {
  if (segment.divisionId) return "division";
  if (segment.brandId) return "brand";
  if (!segment.ownerUserId) return "global";
  return "personal";
}

// ── Editor ─────────────────────────────────────────────────────────────────

interface EditorProps {
  mode: "create" | "edit";
  initial: CustomerSegment | null;
  onSaved: (s: CustomerSegment) => void;
  onCancel: () => void;
}

function SegmentEditor({ mode, initial, onSaved, onCancel }: EditorProps) {
  const create = useCreateSegment();
  const update = useUpdateSegment();
  const remove = useDeleteSegment();
  const preview = usePreviewSegment();
  const isSaving = create.isPending || update.isPending;

  const [form, setForm] = React.useState<FormState>(() => initialForm(initial));
  React.useEffect(() => {
    setForm(initialForm(initial));
  }, [initial?.id]);

  // Debounced live preview.
  const [debouncedFilter, setDebouncedFilter] = React.useState<SegmentFilter>(
    form.filter,
  );
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(form.filter), 500);
    return () => clearTimeout(t);
  }, [form.filter]);

  React.useEffect(() => {
    // Only preview when there's at least one filter active — otherwise the
    // backend would return the whole customer table.
    if (Object.keys(debouncedFilter).length === 0) return;
    preview.mutate(debouncedFilter);
    // We only want to react to filter changes; the mutation object is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilter]);

  const previewCustomers = (preview.data ?? []) as SegmentCustomer[];
  const previewCount = previewCustomers.length;

  async function handleSave() {
    if (mode === "create") {
      const created = await create.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        filter: form.filter,
        isDynamic: true,
        scope: form.scope,
      });
      onSaved(created);
      return;
    }
    if (initial) {
      const updated = await update.mutateAsync({
        id: initial.id,
        name: form.name,
        description: form.description || undefined,
        filter: form.filter,
      });
      onSaved(updated);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`¿Eliminar el segmento "${initial.name}"?`)) return;
    await remove.mutateAsync(initial.id);
    onCancel();
  }

  const canSave =
    form.name.trim().length > 0 && Object.keys(form.filter).length > 0;
  const hasFilters = Object.keys(form.filter).length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-6 py-4 lg:px-10">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-heading)] text-2xl tracking-tight text-foreground">
            {mode === "create" ? "Nuevo segmento" : initial?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === "create"
              ? "Define filtros y comparte con tu división."
              : "Edita filtros y observa el efecto en vivo."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="h-10 text-destructive hover:bg-destructive/10"
            >
              Eliminar
            </Button>
          ) : null}
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
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <FilterGroup title="Identificación">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" htmlFor="seg-name">
                  <Input
                    id="seg-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="VIP con cumple en el mes"
                  />
                </Field>
                <Field label="Descripción" htmlFor="seg-desc">
                  <Input
                    id="seg-desc"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Opcional"
                  />
                </Field>
              </div>
              {mode === "create" ? (
                <Field label="Alcance">
                  <ScopeSelector
                    value={form.scope}
                    onChange={(v) => setForm((f) => ({ ...f, scope: v }))}
                  />
                </Field>
              ) : null}
            </FilterGroup>

            <FilterGroup title="Ciclo de vida">
              <ChipMultiSelect
                options={LIFECYCLE_STAGES.map((s) => ({
                  value: s,
                  label: LIFECYCLE_LABEL[s],
                }))}
                value={form.filter.lifecycleStages ?? []}
                onChange={(next) =>
                  updateFilter(setForm, "lifecycleStages", next, true)
                }
              />
            </FilterGroup>

            <FilterGroup title="Lealtad">
              <ChipMultiSelect
                options={LOYALTY_TIERS.map((t) => ({
                  value: t,
                  label: t.charAt(0).toUpperCase() + t.slice(1),
                }))}
                value={form.filter.loyaltyTiers ?? []}
                onChange={(next) =>
                  updateFilter(setForm, "loyaltyTiers", next, true)
                }
              />
            </FilterGroup>

            <FilterGroup title="Recencia y valor">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Días desde última compra (min)">
                  <NumberInput
                    value={form.filter.daysSinceLastOrderMin}
                    onChange={(v) =>
                      updateFilter(setForm, "daysSinceLastOrderMin", v)
                    }
                    placeholder="Sin mínimo"
                  />
                </Field>
                <Field label="Días desde última compra (max)">
                  <NumberInput
                    value={form.filter.daysSinceLastOrderMax}
                    onChange={(v) =>
                      updateFilter(setForm, "daysSinceLastOrderMax", v)
                    }
                    placeholder="Sin máximo"
                  />
                </Field>
                <Field label="Gasto acumulado mínimo (MXN)">
                  <NumberInput
                    value={form.filter.totalSpentMin}
                    onChange={(v) => updateFilter(setForm, "totalSpentMin", v)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Número mínimo de órdenes">
                  <NumberInput
                    value={form.filter.ordersCountMin}
                    onChange={(v) => updateFilter(setForm, "ordersCountMin", v)}
                    placeholder="0"
                  />
                </Field>
              </div>
            </FilterGroup>

            <FilterGroup title="Eventos">
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  active={!!form.filter.birthdayThisMonth}
                  onClick={() =>
                    updateFilter(
                      setForm,
                      "birthdayThisMonth",
                      form.filter.birthdayThisMonth ? undefined : true,
                    )
                  }
                >
                  Cumpleaños este mes
                </ToggleChip>
                <ToggleChip
                  active={form.filter.isActive === true}
                  onClick={() =>
                    updateFilter(
                      setForm,
                      "isActive",
                      form.filter.isActive === true ? undefined : true,
                    )
                  }
                >
                  Activas
                </ToggleChip>
              </div>
            </FilterGroup>
          </section>

          <aside className="lg:sticky lg:top-0 lg:self-start">
            <PreviewPanel
              loading={preview.isPending}
              count={previewCount}
              customers={previewCustomers}
              hasFilters={hasFilters}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Sub-bits ───────────────────────────────────────────────────────────────

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

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

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      min="0"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? undefined : Number(raw));
      }}
    />
  );
}

function ChipMultiSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(v: T) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <ToggleChip
            key={o.value}
            active={active}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </ToggleChip>
        );
      })}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex h-8 items-center gap-1 rounded-full bg-foreground px-3 text-xs font-medium text-background"
          : "inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted/40"
      }
    >
      {active ? <CheckCircleGlyph className="size-3" /> : null}
      {children}
    </button>
  );
}

function ScopeSelector({
  value,
  onChange,
}: {
  value: SegmentScope;
  onChange: (next: SegmentScope) => void;
}) {
  // NRM can pick personal/brand/division. "global" stays in the schema but
  // the API forces non-admin callers back to a safe scope, so we hide it.
  const options: SegmentScope[] = ["personal", "brand", "division"];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-muted/40",
            )}
          >
            <p className="text-sm font-semibold">{SCOPE_LABEL[s]}</p>
            <p
              className={cn(
                "mt-1 text-[11px]",
                active ? "text-background/80" : "text-muted-foreground",
              )}
            >
              {SCOPE_HINT[s]}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function PreviewPanel({
  loading,
  count,
  customers,
  hasFilters,
}: {
  loading: boolean;
  count: number;
  customers: SegmentCustomer[];
  hasFilters: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Vista previa
        </p>
        <p className="mt-1 font-[family-name:var(--font-heading)] text-3xl font-semibold tabular-nums text-foreground">
          {hasFilters ? (loading ? "—" : count.toLocaleString("es-MX")) : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {hasFilters
            ? `${count === 1 ? "clienta coincide" : "clientas coinciden"} en este momento`
            : "Añade un filtro para ver coincidencias"}
        </p>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {!hasFilters ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            La vista previa se activa al añadir al menos un filtro.
          </div>
        ) : loading && customers.length === 0 ? (
          <ul className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="size-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </li>
            ))}
          </ul>
        ) : customers.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            Ninguna clienta coincide. Relaja un filtro para ampliar.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {customers.slice(0, 20).map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                <CustomerAvatar
                  firstName={c.firstName}
                  lastName={c.lastName}
                  avatarUrl={c.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.lifecycleStage}
                    {c.loyaltyTier ? ` · ${c.loyaltyTier}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {formatCompactMoney(Number(c.totalSpent))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Form helpers ───────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  scope: SegmentScope;
  filter: SegmentFilter;
}

function initialForm(s: CustomerSegment | null): FormState {
  if (!s) {
    return {
      name: "",
      description: "",
      scope: "personal",
      filter: {},
    };
  }
  return {
    name: s.name,
    description: s.description ?? "",
    scope: inferScope(s),
    filter: s.filter ?? {},
  };
}

/**
 * Updates a single key on the filter object. When `next` is empty (empty
 * array, undefined, etc.) we delete the key so the filter object stays
 * minimal — matters for the "no filter at all → don't preview" guard.
 */
function updateFilter<K extends keyof SegmentFilter>(
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  key: K,
  next: SegmentFilter[K],
  isArray = false,
) {
  setForm((f) => {
    const filter = { ...f.filter };
    const isEmpty =
      next === undefined ||
      next === null ||
      (isArray && Array.isArray(next) && next.length === 0);
    if (isEmpty) {
      delete filter[key];
    } else {
      filter[key] = next;
    }
    return { ...f, filter };
  });
}
