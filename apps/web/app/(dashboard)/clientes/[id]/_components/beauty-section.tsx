"use client";

import * as React from "react";
import { useBeautyProfile, useProducts, type Product } from "@/lib/hooks";
import type { Shade } from "@/lib/hooks/use-customer-detail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BeautyIllustration } from "@/components/ui/illustrations";
import { cn } from "@/lib/utils";
import { BeautyWizardSheet } from "./beauty-wizard-sheet";
import { ShadeSheet } from "./shade-sheet";

// ── Beauty profile section — editorial "beauty card" ───────────────
// Replaces the two generic cards + table with a single luxury surface
// that reads like a beauty pass: hero swatch, concern chips, shade
// circles, preferences tucked underneath.

const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: "Seca",
  oily: "Grasa",
  combination: "Mixta",
  sensitive: "Sensible",
  normal: "Normal",
};

const SKIN_TONE_LABELS: Record<string, string> = {
  fair: "Clara",
  light: "Ligera",
  medium: "Media",
  tan: "Morena",
  deep: "Oscura",
};

const SKIN_TONE_SWATCH: Record<string, string> = {
  fair: "#F2D7C3",
  light: "#E2BC9A",
  medium: "#C99772",
  tan: "#A06F4E",
  deep: "#5C3823",
};

const SUBTONE_LABELS: Record<string, string> = {
  cool: "Subtono frío",
  neutral: "Subtono neutro",
  warm: "Subtono cálido",
};

const SUBTONE_GRADIENT: Record<string, string> = {
  cool: "linear-gradient(135deg, #F6C5C5 0%, #D9A8C7 100%)",
  neutral: "linear-gradient(135deg, #E8C8AC 0%, #C7A98E 100%)",
  warm: "linear-gradient(135deg, #F3D49B 0%, #D9A66B 100%)",
};

const CONCERN_LABELS: Record<string, { label: string; emoji: string }> = {
  acne: { label: "Acné", emoji: "🎯" },
  aging: { label: "Anti-edad", emoji: "⏳" },
  pigmentation: { label: "Pigmentación", emoji: "🌗" },
  dryness: { label: "Hidratación", emoji: "💧" },
  sensitivity: { label: "Sensibilidad", emoji: "🌿" },
  pores: { label: "Poros", emoji: "◯" },
  dark_circles: { label: "Ojeras", emoji: "👁️" },
  redness: { label: "Rojeces", emoji: "🌹" },
};

const FRAGRANCE_LABELS: Record<string, { label: string; emoji: string }> = {
  floral: { label: "Floral", emoji: "🌸" },
  woody: { label: "Amaderada", emoji: "🌳" },
  citrus: { label: "Cítrica", emoji: "🍋" },
  oriental: { label: "Oriental", emoji: "🪔" },
  fresh: { label: "Fresca", emoji: "🌊" },
  gourmand: { label: "Gourmand", emoji: "🍯" },
};

const ROUTINE_LABELS: Record<string, { label: string; emoji: string }> = {
  morning: { label: "Rutina AM", emoji: "🌅" },
  night: { label: "Rutina PM", emoji: "🌙" },
  both: { label: "AM + PM", emoji: "🌗" },
};

const INTEREST_LABELS: Record<string, { label: string; emoji: string }> = {
  skincare: { label: "Skincare", emoji: "💧" },
  makeup: { label: "Maquillaje", emoji: "💄" },
  fragrance: { label: "Fragancia", emoji: "🌸" },
};

const SHADE_CATEGORY_LABELS: Record<string, string> = {
  foundation: "Base",
  concealer: "Corrector",
  lipstick: "Labial",
  blush: "Rubor",
};

interface BeautySectionProps {
  customerId: string;
  customerName: string;
  role: string;
}

export function BeautySection({ customerId, customerName }: BeautySectionProps) {
  const { data: profile, isLoading } = useBeautyProfile(customerId);
  // Look up product/brand for each shade so we can render names instead of
  // raw UUIDs. Same trade-off as the recommendations section.
  const { data: products = [] } = useProducts({ limit: "200" });
  const productMap = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [shadeOpen, setShadeOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-2xl border border-border/40 bg-muted/30" />
        <div className="h-24 animate-pulse rounded-2xl border border-border/40 bg-muted/30" />
      </div>
    );
  }

  const hasProfile =
    !!profile &&
    !!(
      profile.skinType ||
      profile.skinTone ||
      profile.skinSubtone ||
      (profile.skinConcerns && profile.skinConcerns.length > 0)
    );

  if (!hasProfile) {
    return (
      <>
        <EmptyState
          illustration={<BeautyIllustration />}
          title="Sin perfil de belleza"
          description="Captura el tipo de piel, tono, subtono y preocupaciones para personalizar cada recomendación."
          action={<Button onClick={() => setWizardOpen(true)}>Capturar perfil</Button>}
        />
        <BeautyWizardSheet
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          customerId={customerId}
          customerName={customerName}
          profile={profile ?? null}
        />
      </>
    );
  }

  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt) : null;
  const shades = profile?.shades ?? [];
  const concerns = profile?.skinConcerns ?? [];
  const fragrances = profile?.fragrancePreferences ?? [];
  const interests = profile?.interests ?? [];
  const preferred = profile?.preferredIngredients ?? [];
  const avoided = profile?.avoidedIngredients ?? [];

  return (
    <div className="space-y-4">
      {/* ─── Hero card: skin profile ───────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex flex-wrap items-start gap-6 p-6">
          {/* Big swatch */}
          {profile?.skinTone && (
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="relative">
                <span
                  className="block size-24 rounded-full shadow-inner"
                  style={{
                    backgroundColor:
                      SKIN_TONE_SWATCH[profile.skinTone] ?? "#C99772",
                  }}
                  aria-hidden
                />
                {profile.skinSubtone && (
                  <span
                    className="absolute -bottom-1 -right-1 block size-9 rounded-full border-4 border-card"
                    style={{
                      background:
                        SUBTONE_GRADIENT[profile.skinSubtone] ??
                        SUBTONE_GRADIENT.neutral,
                    }}
                    aria-hidden
                  />
                )}
              </div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Tono · Subtono
              </p>
            </div>
          )}

          {/* Editorial copy */}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Perfil de belleza
            </p>
            <h2 className="font-heading text-2xl leading-tight tracking-tight text-foreground">
              {composeHeadline(profile)}
            </h2>
            {profile?.skinSubtone && (
              <p className="text-sm text-muted-foreground">
                {SUBTONE_LABELS[profile.skinSubtone]}
              </p>
            )}
            {updatedAt && (
              <p className="text-[11px] text-muted-foreground/70">
                Actualizado{" "}
                {updatedAt.toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setWizardOpen(true)}
          >
            Actualizar perfil
          </Button>
        </div>

        {/* Concerns row */}
        {concerns.length > 0 && (
          <div className="border-t border-border/30 px-6 py-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Preocupaciones
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {concerns.map((c) => {
                const meta = CONCERN_LABELS[c];
                return (
                  <li key={c}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
                      {meta && (
                        <span aria-hidden>{meta.emoji}</span>
                      )}
                      {meta?.label ?? c}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* ─── Shades ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/60 bg-card">
        <header className="flex items-center justify-between border-b border-border/30 px-5 py-3.5">
          <div>
            <h3 className="font-heading text-[15px] tracking-tight text-foreground">
              Tonos
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {shades.length === 0
                ? "Ningún tono guardado"
                : `${shades.length} tono${shades.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button size="sm" onClick={() => setShadeOpen(true)}>
            Agregar tono
          </Button>
        </header>

        {shades.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              Captura los tonos exactos de base, labial, rubor o corrector que
              la clienta usa.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 p-3 sm:grid-cols-2">
            {shades
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.capturedAt).getTime() -
                  new Date(a.capturedAt).getTime(),
              )
              .map((s) => (
                <ShadeRow
                  key={s.id}
                  shade={s}
                  product={productMap.get(s.productId)}
                />
              ))}
          </ul>
        )}
      </section>

      {/* ─── Preferences ────────────────────────────────────────── */}
      {(profile?.routineType ||
        fragrances.length > 0 ||
        interests.length > 0 ||
        preferred.length > 0 ||
        avoided.length > 0) && (
        <section className="rounded-2xl border border-border/60 bg-card">
          <header className="border-b border-border/30 px-5 py-3.5">
            <h3 className="font-heading text-[15px] tracking-tight text-foreground">
              Preferencias
            </h3>
          </header>

          <div className="space-y-5 p-5">
            {profile?.routineType && (
              <PrefRow label="Rutina">
                <Chip
                  emoji={ROUTINE_LABELS[profile.routineType]?.emoji}
                  label={
                    ROUTINE_LABELS[profile.routineType]?.label ??
                    profile.routineType
                  }
                />
              </PrefRow>
            )}

            {interests.length > 0 && (
              <PrefRow label="Categorías favoritas">
                {interests.map((i) => (
                  <Chip
                    key={i}
                    emoji={INTEREST_LABELS[i]?.emoji}
                    label={INTEREST_LABELS[i]?.label ?? i}
                  />
                ))}
              </PrefRow>
            )}

            {fragrances.length > 0 && (
              <PrefRow label="Fragancias">
                {fragrances.map((f) => (
                  <Chip
                    key={f}
                    emoji={FRAGRANCE_LABELS[f]?.emoji}
                    label={FRAGRANCE_LABELS[f]?.label ?? f}
                  />
                ))}
              </PrefRow>
            )}

            {preferred.length > 0 && (
              <PrefRow label="Ingredientes preferidos" accent="success">
                {preferred.map((ing) => (
                  <Chip key={ing} label={ing} accent="success" />
                ))}
              </PrefRow>
            )}

            {avoided.length > 0 && (
              <PrefRow label="Ingredientes a evitar" accent="destructive">
                {avoided.map((ing) => (
                  <Chip key={ing} label={ing} accent="destructive" />
                ))}
              </PrefRow>
            )}
          </div>
        </section>
      )}

      <BeautyWizardSheet
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        customerId={customerId}
        customerName={customerName}
        profile={profile ?? null}
      />
      <ShadeSheet
        open={shadeOpen}
        onOpenChange={setShadeOpen}
        customerId={customerId}
        customerName={customerName}
      />
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────

function ShadeRow({
  shade,
  product,
}: {
  shade: Shade;
  product: Product | undefined;
}) {
  const captured = new Date(shade.capturedAt);
  const swatchHex = extractHex(product?.shadeOptions, shade.shadeCode);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/40 bg-background p-3">
      <span
        className={cn(
          "size-10 shrink-0 rounded-full ring-1 ring-border/30",
          !swatchHex && "bg-muted",
        )}
        style={swatchHex ? { backgroundColor: swatchHex } : undefined}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {SHADE_CATEGORY_LABELS[shade.category] ?? shade.category}
        </p>
        <p className="truncate font-heading text-[13px] text-foreground">
          {product?.name ?? shade.shadeCode}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {shade.shadeCode}
          {product?.brand?.displayName ? ` · ${product.brand.displayName}` : ""}
        </p>
      </div>
      <time className="shrink-0 text-[10px] text-muted-foreground/70">
        {captured.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
        })}
      </time>
    </li>
  );
}

function PrefRow({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: "success" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.12em]",
          accent === "success" && "text-success",
          accent === "destructive" && "text-destructive",
          !accent && "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <ul className="flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}

function Chip({
  emoji,
  label,
  accent,
}: {
  emoji?: string;
  label: string;
  accent?: "success" | "destructive";
}) {
  return (
    <li>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
          accent === "success" &&
            "border-success/40 bg-success/10 text-success",
          accent === "destructive" &&
            "border-destructive/40 bg-destructive/10 text-destructive",
          !accent && "border-border bg-card text-foreground",
        )}
      >
        {emoji && <span aria-hidden>{emoji}</span>}
        {label}
      </span>
    </li>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function composeHeadline(profile: {
  skinType: string | null;
  skinTone: string | null;
}): string {
  const tone = profile.skinTone
    ? SKIN_TONE_LABELS[profile.skinTone] ?? profile.skinTone
    : null;
  const type = profile.skinType
    ? SKIN_TYPE_LABELS[profile.skinType] ?? profile.skinType
    : null;
  if (tone && type) return `Piel ${tone.toLowerCase()}, ${type.toLowerCase()}`;
  if (tone) return `Piel ${tone.toLowerCase()}`;
  if (type) return `Piel ${type.toLowerCase()}`;
  return "Perfil de belleza";
}

// Pull a hex from the product's shadeOptions when the shape matches.
// Same JSON contract as the shade picker (`{ shades: [{ code, hex }] }`).
function extractHex(
  raw: unknown,
  shadeCode: string,
): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const shades = (raw as Record<string, unknown>).shades;
  if (!Array.isArray(shades)) return undefined;
  for (const s of shades) {
    if (s && typeof s === "object") {
      const code = (s as Record<string, unknown>).code;
      const hex = (s as Record<string, unknown>).hex;
      if (code === shadeCode && typeof hex === "string") return hex;
    }
  }
  return undefined;
}
