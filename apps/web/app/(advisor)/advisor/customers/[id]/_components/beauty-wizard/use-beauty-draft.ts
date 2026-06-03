"use client";

import * as React from "react";
import type { BeautyProfile } from "@/lib/hooks/use-customer-detail";

export interface Draft {
  skinType: string | null;
  skinTone: string | null;
  undertone: string | null;
  skinConcerns: string[];
  preferredIngredients: string[];
  avoidedIngredients: string[];
  fragranceFamilies: string[];
  interests: string[];
}

function emptyDraft(): Draft {
  return {
    skinType: null,
    skinTone: null,
    undertone: null,
    skinConcerns: [],
    preferredIngredients: [],
    avoidedIngredients: [],
    fragranceFamilies: [],
    interests: [],
  };
}

function toDraft(profile: BeautyProfile | null): Draft {
  if (!profile) return emptyDraft();
  return {
    skinType: profile.skinType ?? null,
    skinTone: profile.skinTone ?? null,
    undertone: profile.undertone ?? null,
    skinConcerns: profile.skinConcerns ?? [],
    preferredIngredients: profile.preferredIngredients ?? [],
    avoidedIngredients: profile.avoidedIngredients ?? [],
    fragranceFamilies: profile.fragranceFamilies ?? [],
    interests: profile.interests ?? [],
  };
}

export function useBeautyDraft(profile: BeautyProfile | null, open: boolean) {
  const [draft, setDraft] = React.useState<Draft>(() => emptyDraft());

  React.useEffect(() => {
    if (open) setDraft(toDraft(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id]);

  const patch = React.useCallback((p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  const toggleArray = React.useCallback((key: keyof Draft, value: string) => {
    setDraft((d) => {
      const current = (d[key] as string[]) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...d, [key]: next };
    });
  }, []);

  return { draft, patch, toggleArray };
}
