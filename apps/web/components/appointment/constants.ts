import type * as React from "react";
import {
  ServiceCabinGlyph,
  ServiceFacialGlyph,
  ServiceAnniversaryGlyph,
  ServiceVipCabinGlyph,
  ServiceProductFollowupGlyph,
  ServiceCustomGlyph,
} from "@/components/ui/glyphs";

export type GlyphComponent = React.ComponentType<{ className?: string }>;

export const EVENT_TYPE_GLYPH: Record<string, GlyphComponent> = {
  cabin_service: ServiceCabinGlyph,
  facial: ServiceFacialGlyph,
  anniversary_event: ServiceAnniversaryGlyph,
  vip_cabin: ServiceVipCabinGlyph,
  product_followup: ServiceProductFollowupGlyph,
  custom: ServiceCustomGlyph,
};

export const DEFAULT_DURATION = 60;
export const DAY_RANGE = 14;
