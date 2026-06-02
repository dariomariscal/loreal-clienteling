import * as React from "react";
import { cn } from "@/lib/utils";
import type { SuggestedActionTrigger } from "@loreal/contracts";
import {
  FollowupBirthdayGlyph,
  FollowupReplenishmentGlyph,
  FollowupCheckInGlyph,
  FollowupSpecialEventGlyph,
  FollowupGeneralGlyph,
  SparkleDotGlyph,
  MessageGlyph,
  PurchaseGlyph,
  PackageGlyph,
  AppointmentGlyph,
} from "@/components/ui/glyphs";

type GlyphComponent = (props: { className?: string }) => React.JSX.Element;

interface TriggerVisual {
  label: string;
  Icon: GlyphComponent;
  /** Tailwind background + foreground tokens. Familias semánticas:
   *  rosa = relacional, ámbar = urgencia, verde = stock/disponibilidad,
   *  morado = IA pura, azul = neutro/post-venta. */
  tone:
    | "relational"
    | "urgent"
    | "stock"
    | "ai"
    | "neutral"
    | "luxury";
}

/**
 * Single source of truth for the 12 trigger kinds the engine emits. Every
 * piece of UI that shows a trigger (tasks, today, NBA queue, profile timeline,
 * notifications) reads from here so the icon + label + colour stay consistent.
 */
export const TRIGGER_VISUAL: Record<SuggestedActionTrigger, TriggerVisual> = {
  birthday: {
    label: "Cumpleaños",
    Icon: FollowupBirthdayGlyph,
    tone: "relational",
  },
  replenishment: {
    label: "Reposición",
    Icon: FollowupReplenishmentGlyph,
    tone: "urgent",
  },
  win_back: {
    label: "Reactivar",
    Icon: FollowupCheckInGlyph,
    tone: "urgent",
  },
  vip_cadence: {
    label: "VIP cadencia",
    Icon: FollowupSpecialEventGlyph,
    tone: "luxury",
  },
  new_product_match: {
    label: "Match nuevo",
    Icon: SparkleDotGlyph,
    tone: "ai",
  },
  life_event: {
    label: "Evento de vida",
    Icon: FollowupSpecialEventGlyph,
    tone: "relational",
  },
  abandoned_cart: {
    label: "Carrito",
    Icon: PurchaseGlyph,
    tone: "urgent",
  },
  post_purchase: {
    label: "Post-venta",
    Icon: MessageGlyph,
    tone: "neutral",
  },
  sample_follow_up: {
    label: "Seguir muestra",
    Icon: FollowupGeneralGlyph,
    tone: "neutral",
  },
  wishlist_back_in_stock: {
    label: "Volvió stock",
    Icon: PackageGlyph,
    tone: "stock",
  },
  wishlist_price_drop: {
    label: "Bajó precio",
    Icon: PackageGlyph,
    tone: "stock",
  },
  reservation_expiring: {
    label: "Apartado vence",
    Icon: AppointmentGlyph,
    tone: "urgent",
  },
};

const TONE_CLASSES: Record<TriggerVisual["tone"], string> = {
  relational:
    "bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]",
  urgent: "bg-warning/12 text-warning",
  stock: "bg-success/12 text-success",
  ai: "bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]",
  neutral: "bg-muted text-muted-foreground",
  luxury: "bg-purple-500/12 text-purple-700 dark:text-purple-300",
};

interface Props {
  trigger: SuggestedActionTrigger;
  /** "default" = icon + label; "icon" = circular icon-only. */
  variant?: "default" | "icon";
  size?: "sm" | "default";
  className?: string;
}

export function TriggerPill({
  trigger,
  variant = "default",
  size = "default",
  className,
}: Props) {
  const visual = TRIGGER_VISUAL[trigger];
  if (!visual) return null;
  const { Icon, label, tone } = visual;

  if (variant === "icon") {
    return (
      <span
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full",
          size === "sm" ? "size-5" : "size-7",
          TONE_CLASSES[tone],
          className,
        )}
      >
        <Icon className={cn(size === "sm" ? "size-3" : "size-3.5")} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium",
        size === "sm" ? "h-5 px-2 text-[10px]" : "h-6 px-2.5 text-[11px]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "size-3" : "size-3.5")} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
