"use client";

import {
  COMMON_AVOIDED,
  COMMON_PREFERRED,
  FRAGRANCES,
  INTERESTS,
  ROUTINE_TYPES,
} from "../constants";
import type { Draft } from "../use-beauty-draft";
import { ChipToggle, Heading, IngredientPicker, SubSection } from "../ui";

export function PreferencesStep({
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

      <SubSection title="Ingredientes preferidos" accent="success">
        <IngredientPicker
          values={draft.preferredIngredients}
          suggestions={COMMON_PREFERRED}
          accent="success"
          onToggleSuggestion={onTogglePreferred}
          onChange={onSetPreferred}
        />
      </SubSection>

      <SubSection title="Ingredientes a evitar" accent="destructive">
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
