"use client";

import * as React from "react";
import { useBeautyProfile } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BeautyIllustration } from "@/components/ui/illustrations";
import { can } from "@/lib/permissions";
import { BeautyWizardSheet } from "../beauty-wizard/beauty-wizard-sheet";
import { ShadeSheet } from "../shade/shade-sheet";
import {
  CONCERN_LABELS,
  FRAGRANCE_LABELS,
  INTEREST_LABELS,
  SKIN_TONE_SWATCH,
  SUBTONE_GRADIENT,
  SUBTONE_LABELS,
  composeHeadline,
} from "./constants";
import { Chip } from "./chip";
import { PrefRow } from "./pref-row";
import { ShadeRow } from "./shade-row";

// Beauty profile section — editorial "beauty card".
// Hero swatch, concern chips, shade circles, preferences tucked underneath.

interface BeautySectionProps {
  customerId: string;
  customerName: string;
  role: string;
}

export function BeautySection({ customerId, customerName, role }: BeautySectionProps) {
  const canEdit = can(role, "beauty.edit");
  const { data: profile, isLoading } = useBeautyProfile(customerId);

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
      profile.undertone ||
      (profile.skinConcerns && profile.skinConcerns.length > 0)
    );

  if (!hasProfile) {
    return (
      <>
        <EmptyState
          illustration={<BeautyIllustration />}
          title="Sin perfil de belleza"
          description={
            canEdit
              ? "Captura el tipo de piel, tono, subtono y preocupaciones para personalizar cada recomendación."
              : "La Beauty Advisor aún no ha capturado el perfil de esta clienta."
          }
          action={
            canEdit ? (
              <Button onClick={() => setWizardOpen(true)}>Capturar perfil</Button>
            ) : undefined
          }
        />
        {canEdit && (
          <BeautyWizardSheet
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            customerId={customerId}
            customerName={customerName}
            profile={profile ?? null}
          />
        )}
      </>
    );
  }

  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt) : null;
  const shades = profile?.shades ?? [];
  const concerns = profile?.skinConcerns ?? [];
  const fragrances = profile?.fragranceFamilies ?? [];
  const interests = profile?.interests ?? [];
  const preferred = profile?.preferredIngredients ?? [];
  const avoided = profile?.avoidedIngredients ?? [];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex flex-wrap items-start gap-6 p-6">
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
                {profile.undertone && (
                  <span
                    className="absolute -bottom-1 -right-1 block size-9 rounded-full border-4 border-card"
                    style={{
                      background:
                        SUBTONE_GRADIENT[profile.undertone] ??
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

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Perfil de belleza
            </p>
            <h2 className="font-heading text-2xl leading-tight tracking-tight text-foreground">
              {composeHeadline(profile)}
            </h2>
            {profile?.undertone && (
              <p className="text-sm text-muted-foreground">
                {SUBTONE_LABELS[profile.undertone]}
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

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWizardOpen(true)}
            >
              Actualizar perfil
            </Button>
          )}
        </div>

        {concerns.length > 0 && (
          <div className="border-t border-border/30 px-6 py-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Preocupaciones
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {concerns.map((c) => {
                const meta = CONCERN_LABELS[c];
                const Glyph = meta?.Glyph;
                return (
                  <li key={c}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
                      {Glyph && (
                        <Glyph className="size-3.5 text-muted-foreground" />
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
          {canEdit && (
            <Button size="sm" onClick={() => setShadeOpen(true)}>
              Agregar tono
            </Button>
          )}
        </header>

        {shades.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              {canEdit
                ? "Captura los tonos exactos de base, labial, rubor o corrector que la clienta usa."
                : "La Beauty Advisor aún no ha capturado tonos para esta clienta."}
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
              .map((s) => <ShadeRow key={s.id} shade={s} />)}
          </ul>
        )}
      </section>

      {(fragrances.length > 0 ||
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
            {interests.length > 0 && (
              <PrefRow label="Categorías favoritas">
                {interests.map((i) => (
                  <Chip
                    key={i}
                    Glyph={INTEREST_LABELS[i]?.Glyph}
                    label={INTEREST_LABELS[i]?.label ?? i}
                  />
                ))}
              </PrefRow>
            )}

            {fragrances.length > 0 && (
              <PrefRow label="Fragancias">
                {fragrances.map((f: string) => (
                  <Chip
                    key={f}
                    Glyph={FRAGRANCE_LABELS[f]?.Glyph}
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

      {canEdit && (
        <>
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
        </>
      )}
    </div>
  );
}
