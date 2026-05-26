"use client";

import * as React from "react";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { BrandGlyph, PlusGlyph } from "@/components/ui/glyphs";
import { BRAND_TIERS } from "@loreal/contracts";
import {
  useBrand,
  useBrands,
  useUpdateBrand,
  useUpdateBrandConfig,
} from "@/lib/hooks/use-brands";
import { BrandPreviewCanvas } from "@/components/manager/brand-preview-canvas";
import { cn } from "@/lib/utils";
import { formatCompactMoney } from "@/components/manager/format";

/**
 * NRM brand manager. Two-column shell: list of brands on the left (cards
 * with the brand's own colors so the list IS a preview of how each brand
 * paints), editor on the right with a live `BrandPreviewCanvas` underneath
 * the form. Tokens propagate to the canvas as the user types — Tokens
 * Studio for Figma is the reference pattern.
 *
 * Two separate mutations under the hood:
 *   - `useUpdateBrand` for the brand row (displayName, tier, logoUrl).
 *   - `useUpdateBrandConfig` for the visual + VIP-threshold config row.
 * The server enforces division ownership, so the form doesn't need to
 * carry the division.
 */
export function NationalBrandsPage() {
  const { data: brands, isLoading } = useBrands();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Auto-pick the first brand once the list loads.
  React.useEffect(() => {
    if (!selectedId && brands && brands.length > 0) {
      setSelectedId(brands[0].id);
    }
  }, [brands, selectedId]);

  return (
    <ThreeColumnLayout
      list={
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-[family-name:var(--font-heading)] text-base font-medium tracking-tight">
              Marcas de la división
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {brands?.length ?? 0}{" "}
              {brands?.length === 1 ? "marca" : "marcas"} — edita identidad y
              umbrales VIP
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <BrandsListSkeleton />
            ) : !brands || brands.length === 0 ? (
              <AdvisorEmptyState
                icon={<BrandGlyph className="size-6" />}
                title="Sin marcas"
                description="Pide al admin que asocie marcas a tu división."
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {brands.map((b) => (
                  <li key={b.id}>
                    <BrandListCard
                      brand={b}
                      active={selectedId === b.id}
                      onClick={() => setSelectedId(b.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      }
      detail={
        selectedId ? (
          <BrandEditor brandId={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Selecciona una marca a la izquierda para editarla.
          </div>
        )
      }
    />
  );
}

// ── List ───────────────────────────────────────────────────────────────────

function BrandListCard({
  brand,
  active,
  onClick,
}: {
  brand: NonNullable<ReturnType<typeof useBrands>["data"]>[number];
  active: boolean;
  onClick: () => void;
}) {
  const accent = brand.accentColor ?? brand.primaryColor ?? "#c8a04d";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-foreground/15 bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))]"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-md text-white"
        style={{ backgroundColor: brand.primaryColor ?? "#1a1a1a" }}
      >
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt=""
            className="max-h-7 max-w-8 object-contain"
          />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {brand.code.slice(0, 3)}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {brand.displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {brand.code} ·{" "}
          <span className="uppercase tracking-wider">{brand.tier}</span>
        </p>
      </div>
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
      />
    </button>
  );
}

function BrandsListSkeleton() {
  return (
    <ul className="flex flex-col gap-1">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-lg border border-transparent p-3"
        >
          <span className="size-10 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Editor ─────────────────────────────────────────────────────────────────

function BrandEditor({ brandId }: { brandId: string }) {
  const { data: brand, isLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand();
  const updateConfig = useUpdateBrandConfig();

  // Form state — initialized from the loaded brand, then owned by the form.
  // Reset whenever we navigate to a different brand.
  const [form, setForm] = React.useState<FormState>(() => makeEmptyForm());
  React.useEffect(() => {
    if (brand) setForm(brandToForm(brand));
  }, [brand]);

  if (isLoading || !brand) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const isDirty = form.dirty;
  const isSaving = updateBrand.isPending || updateConfig.isPending;

  async function handleSave() {
    // Update the brand row first (cheap rename), then the config (visual
    // tokens). The two mutations both invalidate `brandKeys.all`, so the
    // list on the left updates after the second resolves.
    await updateBrand.mutateAsync({
      id: brandId,
      displayName: form.displayName,
      tier: form.tier,
      logoUrl: form.logoUrl || "",
    });
    await updateConfig.mutateAsync({
      brandId,
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      logoUrl: form.logoUrl || "",
      vipThresholdAmount: form.vipThresholdAmount,
      vipThresholdPeriodMonths: form.vipThresholdPeriodMonths,
    });
    setForm((f) => ({ ...f, dirty: false }));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-6 py-4 lg:px-10">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-heading)] text-2xl tracking-tight text-foreground">
            {brand.displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            {brand.code}{" "}
            <Badge variant="outline" className="ml-1 uppercase tracking-wider">
              {brand.tier}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="text-xs text-muted-foreground">
              Cambios sin guardar
            </span>
          ) : null}
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="h-10"
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          <FormPanel form={form} setForm={setForm} />
          <PreviewPanel form={form} />
        </div>
      </div>
    </div>
  );
}

function FormPanel({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <section className="space-y-6">
      <FieldGroup title="Identidad">
        <div className="space-y-3">
          <Field label="Nombre visible" htmlFor="brand-name">
            <Input
              id="brand-name"
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  displayName: e.target.value,
                  dirty: true,
                }))
              }
            />
          </Field>
          <Field label="Tier" htmlFor="brand-tier">
            <Select
              value={form.tier}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tier: v ?? f.tier, dirty: true }))
              }
            >
              <SelectTrigger id="brand-tier" className="w-full">
                <SelectValue placeholder="Selecciona el tier" />
              </SelectTrigger>
              <SelectContent>
                {BRAND_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="capitalize">{t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Logo (URL)" htmlFor="brand-logo">
            <Input
              id="brand-logo"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  logoUrl: e.target.value,
                  dirty: true,
                }))
              }
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Paleta visual">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Color primario" htmlFor="brand-primary">
            <ColorPicker
              id="brand-primary"
              value={form.primaryColor}
              onChange={(v) =>
                setForm((f) => ({ ...f, primaryColor: v, dirty: true }))
              }
            />
          </Field>
          <Field label="Color de acento" htmlFor="brand-accent">
            <ColorPicker
              id="brand-accent"
              value={form.accentColor}
              onChange={(v) =>
                setForm((f) => ({ ...f, accentColor: v, dirty: true }))
              }
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Umbral VIP">
        <p className="text-xs text-muted-foreground">
          Define cuánto debe gastar una clienta para entrar a VIP, y en cuántos
          meses se evalúa. Se aplica al cálculo del lifecycle stage en toda la
          marca.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Monto mínimo (MXN)" htmlFor="brand-vip">
            <Input
              id="brand-vip"
              type="number"
              min="0"
              value={form.vipThresholdAmount ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vipThresholdAmount:
                    e.target.value === "" ? undefined : Number(e.target.value),
                  dirty: true,
                }))
              }
            />
          </Field>
          <Field label="Periodo (meses)" htmlFor="brand-period">
            <Input
              id="brand-period"
              type="number"
              min="1"
              value={form.vipThresholdPeriodMonths ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vipThresholdPeriodMonths:
                    e.target.value === "" ? undefined : Number(e.target.value),
                  dirty: true,
                }))
              }
            />
          </Field>
        </div>
        {form.vipThresholdAmount ? (
          <p className="text-xs text-muted-foreground">
            Una clienta debe gastar{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCompactMoney(form.vipThresholdAmount)}
            </span>{" "}
            en los últimos {form.vipThresholdPeriodMonths ?? 12}{" "}
            {form.vipThresholdPeriodMonths === 1 ? "mes" : "meses"} para
            ser VIP.
          </p>
        ) : null}
      </FieldGroup>
    </section>
  );
}

function PreviewPanel({ form }: { form: FormState }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-[family-name:var(--font-heading)] text-sm font-medium text-foreground">
          Vista previa en vivo
        </p>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Se actualiza al editar
        </span>
      </div>
      <BrandPreviewCanvas
        tokens={{
          displayName: form.displayName,
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
          logoUrl: form.logoUrl || null,
        }}
      />
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-xs text-muted-foreground">
        Esta vista emula cómo la marca aparece en el sidebar y los componentes
        de tus equipos. No representa la app real al 100% — es una guía para
        validar contraste y reconocimiento.
      </div>
    </section>
  );
}

// ── Bits ───────────────────────────────────────────────────────────────────

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
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

// ── Form state ─────────────────────────────────────────────────────────────

interface FormState {
  displayName: string;
  tier: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  vipThresholdAmount?: number;
  vipThresholdPeriodMonths?: number;
  dirty: boolean;
}

function makeEmptyForm(): FormState {
  return {
    displayName: "",
    tier: "premium",
    logoUrl: "",
    primaryColor: "",
    accentColor: "",
    vipThresholdAmount: undefined,
    vipThresholdPeriodMonths: undefined,
    dirty: false,
  };
}

function brandToForm(
  brand: NonNullable<ReturnType<typeof useBrand>["data"]>,
): FormState {
  return {
    displayName: brand.displayName,
    tier: brand.tier,
    logoUrl: brand.logoUrl ?? brand.config?.logoUrl ?? "",
    primaryColor: brand.primaryColor ?? brand.config?.primaryColor ?? "",
    accentColor: brand.accentColor ?? brand.config?.accentColor ?? "",
    vipThresholdAmount: brand.config?.vipThresholdAmount
      ? Number(brand.config.vipThresholdAmount)
      : undefined,
    vipThresholdPeriodMonths:
      brand.config?.vipThresholdPeriodMonths ?? undefined,
    dirty: false,
  };
}
