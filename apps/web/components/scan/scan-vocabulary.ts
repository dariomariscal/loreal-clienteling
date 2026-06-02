import type { ScanActionType } from "@loreal/contracts";
import type * as React from "react";
import {
  PackageGlyph,
  HeartGlyph,
  PurchaseGlyph,
  MessageGlyph,
  CheckCircleGlyph,
  EyeGlyph,
  CalendarPlusGlyph,
} from "@/components/ui/glyphs";

/**
 * Tone families mirror `trigger-pill.tsx` so the visual grammar stays
 * consistent across Today, Profile and Scan:
 *
 *   primary    – the BA's first move, brand accent on solid (rose-gold)
 *   relational – Today/profile recall, accent-soft
 *   urgent     – amber, time-sensitive (replenishment, low stock)
 *   stock      – emerald, availability-positive
 *   neutral    – muted, observational (shown_to_customer, viewed_only)
 *   ai         – accent-soft, IA-driven action
 */
export type ScanActionTone =
  | "primary"
  | "relational"
  | "urgent"
  | "stock"
  | "neutral"
  | "ai";

type GlyphComponent = (props: { className?: string }) => React.JSX.Element;

interface ScanActionVisual {
  label: string;
  shortLabel: string;
  Icon: GlyphComponent;
  tone: ScanActionTone;
}

/**
 * Single source of truth for the 7 scan action types the lookup endpoint can
 * emit. Every piece of UI that renders a scan action (bottom sheet, chips,
 * recent strip badges) reads from here.
 *
 * Naming follows the domain: `add_to_cart` is "Agregar a carrito" — never
 * "Comprar" — to match the rest of the advisor app and the BA's spoken
 * register on the floor.
 */
export const SCAN_ACTION_VISUAL: Record<ScanActionType, ScanActionVisual> = {
  add_to_cart: {
    label: "Agregar a carrito",
    shortLabel: "Carrito",
    Icon: PurchaseGlyph,
    tone: "primary",
  },
  add_to_wishlist: {
    label: "Agregar a wishlist",
    shortLabel: "Wishlist",
    Icon: HeartGlyph,
    tone: "relational",
  },
  reserve: {
    label: "Reservar desde otra tienda",
    shortLabel: "Reservar",
    Icon: CalendarPlusGlyph,
    tone: "urgent",
  },
  sample_logged: {
    label: "Registrar muestra entregada",
    shortLabel: "Muestra",
    Icon: PackageGlyph,
    tone: "neutral",
  },
  shown_to_customer: {
    label: "Registrar 'mostrado a cliente'",
    shortLabel: "Mostrado",
    Icon: EyeGlyph,
    tone: "neutral",
  },
  send_whatsapp: {
    label: "Enviar ficha por WhatsApp",
    shortLabel: "WhatsApp",
    Icon: MessageGlyph,
    tone: "ai",
  },
  viewed_only: {
    label: "Solo vista",
    shortLabel: "Vista",
    Icon: CheckCircleGlyph,
    tone: "neutral",
  },
};

/**
 * Tailwind classes per tone — kept inline rather than exported via a util so
 * the JIT picks up the literal classnames at build time.
 */
export const SCAN_ACTION_TONE_CLASSES: Record<ScanActionTone, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90",
  relational:
    "bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)] hover:bg-[color:var(--ba-accent-soft)]/80",
  urgent:
    "bg-warning/12 text-warning hover:bg-warning/18",
  stock:
    "bg-success/12 text-success hover:bg-success/18",
  neutral:
    "bg-muted text-muted-foreground hover:bg-muted/80",
  ai: "bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)] hover:bg-[color:var(--ba-accent-soft)]/80",
};

/**
 * Stock thresholds mapped to the three semantic colors used in the chips.
 * Single rule, applied in one place so the badge color is never decided in
 * a component by hand.
 */
export function stockTone(available: number): ScanActionTone {
  if (available <= 0) return "neutral";
  if (available <= 3) return "urgent";
  return "stock";
}

export function stockLabel(available: number, scope: "here" | "nearby" | "national"): string {
  const noun =
    scope === "here" ? "aquí" : scope === "nearby" ? "cercanas" : "México";
  return `${available} ${noun}`;
}
