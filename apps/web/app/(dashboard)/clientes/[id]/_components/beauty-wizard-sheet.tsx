"use client";

import * as React from "react";
import { useUpsertBeautyProfile } from "@/lib/hooks";
import type { BeautyProfile } from "@/lib/hooks/use-customer-detail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  SkinDryGlyph,
  SkinOilyGlyph,
  SkinCombinationGlyph,
  SkinSensitiveGlyph,
  SkinNormalGlyph,
  ConcernAcneGlyph,
  ConcernAgingGlyph,
  ConcernPigmentationGlyph,
  ConcernDrynessGlyph,
  ConcernSensitivityGlyph,
  ConcernPoresGlyph,
  ConcernDarkCirclesGlyph,
  ConcernRednessGlyph,
  FragranceFloralGlyph,
  FragranceWoodyGlyph,
  FragranceCitrusGlyph,
  FragranceOrientalGlyph,
  FragranceFreshGlyph,
  FragranceGourmandGlyph,
  RoutineMorningGlyph,
  RoutineNightGlyph,
  RoutineBothGlyph,
  InterestSkincareGlyph,
  InterestMakeupGlyph,
  InterestFragranceGlyph,
} from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

type GlyphComponent = React.ComponentType<{ className?: string }>;

// ── Beauty profile wizard — Ulta/Lancôme pattern ────────────────────
// One question per step, big visual selections, progress dots up top.
// Skin type → tone (swatches) → undertone (swatches) → concerns →
// optional preferences. Designed so the BA can run it with the customer
// looking at the iPad together.

interface BeautyWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  profile: BeautyProfile | null;
}

interface Draft {
  skinType: string | null;
  skinTone: string | null;
  skinSubtone: string | null;
  skinConcerns: string[];
  preferredIngredients: string[];
  avoidedIngredients: string[];
  fragrancePreferences: string[];
  routineType: string | null;
  interests: string[];
}

// ── Step data ─────────────────────────────────────────────────────

const SKIN_TYPES: ReadonlyArray<{
  value: string;
  label: string;
  description: string;
  Glyph: GlyphComponent;
}> = [
  {
    value: "dry",
    label: "Seca",
    description: "Se siente tirante, escamosa o áspera",
    Glyph: SkinDryGlyph,
  },
  {
    value: "oily",
    label: "Grasa",
    description: "Brillo y poros visibles, especialmente en zona T",
    Glyph: SkinOilyGlyph,
  },
  {
    value: "combination",
    label: "Mixta",
    description: "Zona T grasa, mejillas normales o secas",
    Glyph: SkinCombinationGlyph,
  },
  {
    value: "sensitive",
    label: "Sensible",
    description: "Se enrojece, irrita o reacciona con facilidad",
    Glyph: SkinSensitiveGlyph,
  },
  {
    value: "normal",
    label: "Normal",
    description: "Equilibrada, sin extremos",
    Glyph: SkinNormalGlyph,
  },
];

// Real swatch hex values picked to read on neutral backgrounds.
const SKIN_TONES = [
  { value: "fair", label: "Clara", swatch: "#F2D7C3" },
  { value: "light", label: "Ligera", swatch: "#E2BC9A" },
  { value: "medium", label: "Media", swatch: "#C99772" },
  { value: "tan", label: "Morena", swatch: "#A06F4E" },
  { value: "deep", label: "Oscura", swatch: "#5C3823" },
] as const;

const SKIN_SUBTONES = [
  {
    value: "cool",
    label: "Frío",
    swatch: "linear-gradient(135deg, #F6C5C5 0%, #D9A8C7 100%)",
    hint: "Las venas se ven azules o moradas. La plata favorece más que el oro.",
  },
  {
    value: "neutral",
    label: "Neutro",
    swatch: "linear-gradient(135deg, #E8C8AC 0%, #C7A98E 100%)",
    hint: "Mezcla de azules y verdes. Tanto la plata como el oro funcionan.",
  },
  {
    value: "warm",
    label: "Cálido",
    swatch: "linear-gradient(135deg, #F3D49B 0%, #D9A66B 100%)",
    hint: "Las venas se ven verdosas. El oro favorece más que la plata.",
  },
] as const;

type LabeledGlyph = {
  value: string;
  label: string;
  Glyph: GlyphComponent;
};

const SKIN_CONCERNS: ReadonlyArray<LabeledGlyph> = [
  { value: "acne", label: "Acné", Glyph: ConcernAcneGlyph },
  { value: "aging", label: "Anti-edad", Glyph: ConcernAgingGlyph },
  { value: "pigmentation", label: "Pigmentación", Glyph: ConcernPigmentationGlyph },
  { value: "dryness", label: "Hidratación", Glyph: ConcernDrynessGlyph },
  { value: "sensitivity", label: "Sensibilidad", Glyph: ConcernSensitivityGlyph },
  { value: "pores", label: "Poros", Glyph: ConcernPoresGlyph },
  { value: "dark_circles", label: "Ojeras", Glyph: ConcernDarkCirclesGlyph },
  { value: "redness", label: "Rojeces", Glyph: ConcernRednessGlyph },
];

const FRAGRANCES: ReadonlyArray<LabeledGlyph> = [
  { value: "floral", label: "Floral", Glyph: FragranceFloralGlyph },
  { value: "woody", label: "Amaderada", Glyph: FragranceWoodyGlyph },
  { value: "citrus", label: "Cítrica", Glyph: FragranceCitrusGlyph },
  { value: "oriental", label: "Oriental", Glyph: FragranceOrientalGlyph },
  { value: "fresh", label: "Fresca", Glyph: FragranceFreshGlyph },
  { value: "gourmand", label: "Gourmand", Glyph: FragranceGourmandGlyph },
];

const ROUTINE_TYPES: ReadonlyArray<LabeledGlyph> = [
  { value: "morning", label: "Sólo AM", Glyph: RoutineMorningGlyph },
  { value: "night", label: "Sólo PM", Glyph: RoutineNightGlyph },
  { value: "both", label: "AM + PM", Glyph: RoutineBothGlyph },
];

const INTERESTS: ReadonlyArray<LabeledGlyph> = [
  { value: "skincare", label: "Skincare", Glyph: InterestSkincareGlyph },
  { value: "makeup", label: "Maquillaje", Glyph: InterestMakeupGlyph },
  { value: "fragrance", label: "Fragancia", Glyph: InterestFragranceGlyph },
];

const COMMON_PREFERRED = [
  "retinol",
  "niacinamida",
  "ácido hialurónico",
  "vitamina C",
  "péptidos",
  "AHA",
  "BHA",
  "ceramidas",
];
const COMMON_AVOIDED = [
  "alcohol",
  "parabenos",
  "sulfatos",
  "fragancia",
  "siliconas",
  "ácido salicílico",
];

// ── Wizard steps ──────────────────────────────────────────────────

type StepKey =
  | "type"
  | "tone"
  | "subtone"
  | "concerns"
  | "preferences";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "type", label: "Tipo de piel" },
  { key: "tone", label: "Tono" },
  { key: "subtone", label: "Subtono" },
  { key: "concerns", label: "Preocupaciones" },
  { key: "preferences", label: "Preferencias" },
];

export function BeautyWizardSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
  profile,
}: BeautyWizardSheetProps) {
  const upsert = useUpsertBeautyProfile();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [draft, setDraft] = React.useState<Draft>(() => emptyDraft());

  React.useEffect(() => {
    if (open) {
      setDraft(toDraft(profile));
      setStepIndex(0);
      upsert.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function toggleArray(key: keyof Draft, value: string) {
    setDraft((d) => {
      const current = (d[key] as string[]) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...d, [key]: next };
    });
  }

  async function save(closeOnDone: boolean) {
    upsert.mutate(
      {
        customerId,
        skinType: draft.skinType ?? undefined,
        skinTone: draft.skinTone ?? undefined,
        skinSubtone: draft.skinSubtone ?? undefined,
        skinConcerns:
          draft.skinConcerns.length > 0 ? draft.skinConcerns : undefined,
        preferredIngredients:
          draft.preferredIngredients.length > 0
            ? draft.preferredIngredients
            : undefined,
        avoidedIngredients:
          draft.avoidedIngredients.length > 0
            ? draft.avoidedIngredients
            : undefined,
        fragrancePreferences:
          draft.fragrancePreferences.length > 0
            ? draft.fragrancePreferences
            : undefined,
        routineType: draft.routineType ?? undefined,
        interests: draft.interests.length > 0 ? draft.interests : undefined,
      },
      {
        onSuccess: () => {
          if (closeOnDone) onOpenChange(false);
        },
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Perfil de belleza</SheetTitle>
          <SheetDescription>
            De <span className="text-foreground">{customerName}</span>
          </SheetDescription>

          {/* Progress dots */}
          <div className="mt-2 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStepIndex(i)}
                aria-label={`Ir a ${s.label}`}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-200",
                  i < stepIndex && "bg-foreground/80",
                  i === stepIndex && "bg-foreground",
                  i > stepIndex && "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Paso {stepIndex + 1} de {STEPS.length} · {step.label}
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step.key === "type" && (
            <StepSkinType draft={draft} onSelect={(v) => patch({ skinType: v })} />
          )}
          {step.key === "tone" && (
            <StepSkinTone draft={draft} onSelect={(v) => patch({ skinTone: v })} />
          )}
          {step.key === "subtone" && (
            <StepSkinSubtone
              draft={draft}
              onSelect={(v) => patch({ skinSubtone: v })}
            />
          )}
          {step.key === "concerns" && (
            <StepConcerns
              draft={draft}
              onToggle={(v) => toggleArray("skinConcerns", v)}
            />
          )}
          {step.key === "preferences" && (
            <StepPreferences
              draft={draft}
              onRoutine={(v) => patch({ routineType: v })}
              onToggleInterest={(v) => toggleArray("interests", v)}
              onToggleFragrance={(v) =>
                toggleArray("fragrancePreferences", v)
              }
              onTogglePreferred={(v) =>
                toggleArray("preferredIngredients", v)
              }
              onToggleAvoided={(v) =>
                toggleArray("avoidedIngredients", v)
              }
              onSetPreferred={(arr) => patch({ preferredIngredients: arr })}
              onSetAvoided={(arr) => patch({ avoidedIngredients: arr })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/40 bg-muted/30 px-6 py-4">
          {upsert.isError && (
            <Badge variant="destructive" className="mb-3 w-full justify-center">
              No se pudo guardar. Intenta otra vez.
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst || upsert.isPending}
            >
              Atrás
            </Button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={upsert.isPending}
              className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Guardar borrador
            </button>
            <div className="ml-auto flex items-center gap-2">
              <SheetClose>
                <Button variant="outline" disabled={upsert.isPending}>
                  Cancelar
                </Button>
              </SheetClose>
              {isLast ? (
                <Button
                  onClick={() => save(true)}
                  disabled={upsert.isPending}
                >
                  {upsert.isPending ? "Guardando…" : "Guardar perfil"}
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))
                  }
                >
                  Siguiente
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Step components ───────────────────────────────────────────────

function StepSkinType({
  draft,
  onSelect,
}: {
  draft: Draft;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Cómo es su piel?"
        hint="Elige la opción que mejor describe el tipo de piel de la clienta."
      />
      <ul className="grid gap-2 sm:grid-cols-2">
        {SKIN_TYPES.map((t) => {
          const Glyph = t.Glyph;
          return (
            <SelectableCard
              key={t.value}
              selected={draft.skinType === t.value}
              onClick={() => onSelect(t.value)}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-foreground"
                aria-hidden
              >
                <Glyph className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[14px] text-foreground">
                  {t.label}
                </p>
                <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {t.description}
                </p>
              </div>
            </SelectableCard>
          );
        })}
      </ul>
    </div>
  );
}

function StepSkinTone({
  draft,
  onSelect,
}: {
  draft: Draft;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Qué tono tiene su piel?"
        hint="Compara con la piel del rostro en luz natural. El cuello suele ser la mejor referencia."
      />
      <ul className="grid grid-cols-5 gap-2">
        {SKIN_TONES.map((t) => {
          const active = draft.skinTone === t.value;
          return (
            <li key={t.value}>
              <button
                type="button"
                onClick={() => onSelect(t.value)}
                className={cn(
                  "group flex w-full flex-col items-center gap-2 rounded-2xl border bg-card p-3 transition-all duration-200",
                  active
                    ? "border-foreground shadow-sm"
                    : "border-border/60 hover:border-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "size-14 rounded-full ring-2 transition-all",
                    active ? "ring-foreground" : "ring-transparent",
                  )}
                  style={{ backgroundColor: t.swatch }}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepSkinSubtone({
  draft,
  onSelect,
}: {
  draft: Draft;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Cuál es su subtono?"
        hint="Muchas clientas no saben su subtono — usa la pista debajo de cada opción."
      />
      <ul className="grid gap-2 sm:grid-cols-3">
        {SKIN_SUBTONES.map((s) => {
          const active = draft.skinSubtone === s.value;
          return (
            <li key={s.value}>
              <button
                type="button"
                onClick={() => onSelect(s.value)}
                className={cn(
                  "flex h-full w-full flex-col items-start gap-2 rounded-2xl border bg-card p-3 text-left transition-all duration-200",
                  active
                    ? "border-foreground shadow-sm"
                    : "border-border/60 hover:border-foreground/30",
                )}
              >
                <span
                  className="h-12 w-full rounded-xl"
                  style={{ background: s.swatch }}
                  aria-hidden
                />
                <p className="font-heading text-[14px] text-foreground">
                  {s.label}
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {s.hint}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepConcerns({
  draft,
  onToggle,
}: {
  draft: Draft;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Qué le preocupa?"
        hint="Selecciona todas las que apliquen. Esto guía las recomendaciones de productos."
      />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SKIN_CONCERNS.map((c) => {
          const active = draft.skinConcerns.includes(c.value);
          const Glyph = c.Glyph;
          return (
            <li key={c.value}>
              <button
                type="button"
                onClick={() => onToggle(c.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/30",
                )}
              >
                <Glyph className="size-4 shrink-0" />
                <span className="text-[13px] font-medium">{c.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepPreferences({
  draft,
  onRoutine,
  onToggleInterest,
  onToggleFragrance,
  onTogglePreferred,
  onToggleAvoided,
  onSetPreferred,
  onSetAvoided,
}: {
  draft: Draft;
  onRoutine: (v: string) => void;
  onToggleInterest: (v: string) => void;
  onToggleFragrance: (v: string) => void;
  onTogglePreferred: (v: string) => void;
  onToggleAvoided: (v: string) => void;
  onSetPreferred: (arr: string[]) => void;
  onSetAvoided: (arr: string[]) => void;
}) {
  return (
    <div className="space-y-6">
      <Heading
        title="Preferencias"
        hint="Todo este paso es opcional. Solo captura lo que sepas."
      />

      {/* Interests */}
      <SubSection title="Categorías favoritas">
        <ul className="flex flex-wrap gap-1.5">
          {INTERESTS.map((i) => (
            <ChipToggle
              key={i.value}
              active={draft.interests.includes(i.value)}
              Glyph={i.Glyph}
              label={i.label}
              onClick={() => onToggleInterest(i.value)}
            />
          ))}
        </ul>
      </SubSection>

      {/* Routine */}
      <SubSection title="Rutina">
        <ul className="flex flex-wrap gap-1.5">
          {ROUTINE_TYPES.map((r) => (
            <ChipToggle
              key={r.value}
              active={draft.routineType === r.value}
              Glyph={r.Glyph}
              label={r.label}
              onClick={() => onRoutine(r.value)}
            />
          ))}
        </ul>
      </SubSection>

      {/* Fragrance */}
      <SubSection title="Familias de fragancia">
        <ul className="flex flex-wrap gap-1.5">
          {FRAGRANCES.map((f) => (
            <ChipToggle
              key={f.value}
              active={draft.fragrancePreferences.includes(f.value)}
              Glyph={f.Glyph}
              label={f.label}
              onClick={() => onToggleFragrance(f.value)}
            />
          ))}
        </ul>
      </SubSection>

      {/* Preferred ingredients */}
      <SubSection
        title="Ingredientes preferidos"
        accent="success"
      >
        <IngredientPicker
          values={draft.preferredIngredients}
          suggestions={COMMON_PREFERRED}
          accent="success"
          onToggleSuggestion={onTogglePreferred}
          onChange={onSetPreferred}
        />
      </SubSection>

      {/* Avoided ingredients */}
      <SubSection
        title="Ingredientes a evitar"
        accent="destructive"
      >
        <IngredientPicker
          values={draft.avoidedIngredients}
          suggestions={COMMON_AVOIDED}
          accent="destructive"
          onToggleSuggestion={onToggleAvoided}
          onChange={onSetAvoided}
        />
      </SubSection>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function Heading({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="font-heading text-xl tracking-tight text-foreground">
        {title}
      </h3>
      {hint && (
        <p className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function SubSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: "success" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.12em]",
          accent === "success" && "text-success",
          accent === "destructive" && "text-destructive",
          !accent && "text-muted-foreground",
        )}
      >
        {title}
      </p>
      {children}
    </section>
  );
}

function SelectableCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition-all duration-200",
          selected
            ? "border-foreground shadow-sm"
            : "border-border/60 hover:border-foreground/30",
        )}
      >
        {children}
      </button>
    </li>
  );
}

function ChipToggle({
  active,
  Glyph,
  label,
  onClick,
}: {
  active: boolean;
  Glyph?: GlyphComponent;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
          active
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        )}
      >
        {Glyph && <Glyph className="size-3.5" />}
        {label}
      </button>
    </li>
  );
}

function IngredientPicker({
  values,
  suggestions,
  accent,
  onToggleSuggestion,
  onChange,
}: {
  values: string[];
  suggestions: string[];
  accent: "success" | "destructive";
  onToggleSuggestion: (v: string) => void;
  onChange: (arr: string[]) => void;
}) {
  const [input, setInput] = React.useState("");

  function commit() {
    const v = input.trim().toLowerCase();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  const accentClasses =
    accent === "success"
      ? "border-success/40 bg-success/10 text-success"
      : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => remove(v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  accentClasses,
                  "hover:opacity-80",
                )}
              >
                {v}
                <XIcon className="size-2.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder="Escribir ingrediente y presionar Enter…"
        className={cn(
          "h-9 w-full rounded-xl border border-border bg-transparent px-3 text-sm outline-none transition-colors",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        )}
      />

      {/* Suggestions row */}
      <ul className="flex flex-wrap gap-1">
        {suggestions
          .filter((s) => !values.includes(s))
          .map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onToggleSuggestion(s)}
                className="rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                + {s}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

// ── Draft helpers ─────────────────────────────────────────────────

function emptyDraft(): Draft {
  return {
    skinType: null,
    skinTone: null,
    skinSubtone: null,
    skinConcerns: [],
    preferredIngredients: [],
    avoidedIngredients: [],
    fragrancePreferences: [],
    routineType: null,
    interests: [],
  };
}

function toDraft(profile: BeautyProfile | null): Draft {
  if (!profile) return emptyDraft();
  return {
    skinType: profile.skinType ?? null,
    skinTone: profile.skinTone ?? null,
    skinSubtone: profile.skinSubtone ?? null,
    skinConcerns: profile.skinConcerns ?? [],
    preferredIngredients: profile.preferredIngredients ?? [],
    avoidedIngredients: profile.avoidedIngredients ?? [],
    fragrancePreferences: profile.fragrancePreferences ?? [],
    routineType: profile.routineType ?? null,
    interests: profile.interests ?? [],
  };
}
