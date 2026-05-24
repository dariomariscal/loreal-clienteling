"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  EmailDotGlyph,
  SmsDotGlyph,
  WhatsappDotGlyph,
} from "@/components/ui/glyphs";

export type CommunicationChannel = "email" | "sms" | "whatsapp" | string;

interface ChannelGlyphOverlayProps {
  channel: CommunicationChannel;
  className?: string;
}

// VISUAL DEVICE: 14px overlay glyph anchored bottom-right of an avatar.
//
// Front's multi-channel inbox pattern: the entity is the customer, the
// channel is metadata. Painting the entire row by channel (background
// tint or left border) would compete with status and selection — too
// loud. A small monochrome glyph on the avatar reads "metadata" at a
// glance and disappears when not needed.
//
// Each channel gets a single muted color: WhatsApp green (down-mixed
// so it doesn't shout), neutral for SMS, lighter neutral for email.
// The container is a white ring so it pops over any avatar background.
export function ChannelGlyphOverlay({
  channel,
  className,
}: ChannelGlyphOverlayProps) {
  const meta = META[channel];
  if (!meta) return null;

  return (
    <span
      aria-label={meta.label}
      className={cn(
        "pointer-events-none absolute -bottom-0.5 -right-0.5 inline-flex size-[14px] items-center justify-center rounded-full bg-background ring-1 ring-border",
        className,
      )}
      style={{ color: meta.color }}
    >
      <meta.Glyph className="size-[9px]" />
    </span>
  );
}

const META: Record<
  string,
  { label: string; color: string; Glyph: typeof EmailDotGlyph }
> = {
  whatsapp: {
    label: "WhatsApp",
    color: "#1f8a55",
    Glyph: WhatsappDotGlyph,
  },
  sms: {
    label: "SMS",
    color: "#525252",
    Glyph: SmsDotGlyph,
  },
  email: {
    label: "Email",
    color: "#737373",
    Glyph: EmailDotGlyph,
  },
};
