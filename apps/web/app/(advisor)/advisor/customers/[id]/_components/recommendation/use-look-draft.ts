"use client";

import * as React from "react";
import type { Product } from "@/lib/hooks";

export interface DraftLine {
  product: Product;
  notes: string;
}

export function useLookDraft() {
  const [lines, setLines] = React.useState<DraftLine[]>([]);

  const reset = React.useCallback(() => setLines([]), []);

  // Second tap on a selected product removes it — the catalog shows
  // selection state so the toggle feels natural.
  const toggleProduct = React.useCallback((product: Product) => {
    setLines((prev) => {
      if (prev.some((l) => l.product.id === product.id)) {
        return prev.filter((l) => l.product.id !== product.id);
      }
      return [...prev, { product, notes: "" }];
    });
  }, []);

  const updateNotes = React.useCallback((productId: string, notes: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.product.id === productId ? { ...l, notes: notes.slice(0, 1000) } : l,
      ),
    );
  }, []);

  const removeLine = React.useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const selectedIds = React.useMemo(
    () => new Set(lines.map((l) => l.product.id)),
    [lines],
  );

  return { lines, reset, toggleProduct, updateNotes, removeLine, selectedIds };
}
