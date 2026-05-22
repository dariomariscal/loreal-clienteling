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
import { cn } from "@/lib/utils";
import { STEPS } from "./constants";
import { useBeautyDraft } from "./use-beauty-draft";
import { SkinTypeStep } from "./steps/skin-type-step";
import { SkinToneStep } from "./steps/skin-tone-step";
import { SkinSubtoneStep } from "./steps/skin-subtone-step";
import { ConcernsStep } from "./steps/concerns-step";
import { PreferencesStep } from "./steps/preferences-step";

// Beauty profile wizard — Ulta/Lancôme pattern. One question per step,
// big visual selections, progress dots up top. Designed so the BA can
// run it with the customer looking at the iPad together.

interface BeautyWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  profile: BeautyProfile | null;
}

export function BeautyWizardSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
  profile,
}: BeautyWizardSheetProps) {
  const upsert = useUpsertBeautyProfile();
  const [stepIndex, setStepIndex] = React.useState(0);
  const { draft, patch, toggleArray } = useBeautyDraft(profile, open);

  React.useEffect(() => {
    if (open) {
      setStepIndex(0);
      upsert.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  function save(closeOnDone: boolean) {
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
            <SkinTypeStep draft={draft} onSelect={(v) => patch({ skinType: v })} />
          )}
          {step.key === "tone" && (
            <SkinToneStep draft={draft} onSelect={(v) => patch({ skinTone: v })} />
          )}
          {step.key === "subtone" && (
            <SkinSubtoneStep
              draft={draft}
              onSelect={(v) => patch({ skinSubtone: v })}
            />
          )}
          {step.key === "concerns" && (
            <ConcernsStep
              draft={draft}
              onToggle={(v) => toggleArray("skinConcerns", v)}
            />
          )}
          {step.key === "preferences" && (
            <PreferencesStep
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
