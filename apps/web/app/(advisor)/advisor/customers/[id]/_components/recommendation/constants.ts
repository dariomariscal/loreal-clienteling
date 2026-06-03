import type * as React from "react";
import {
  ReasonNewPurchaseGlyph,
  ReasonRebuyGlyph,
  ReasonGiftGlyph,
  ReasonConcernGlyph,
  ReasonPromotionGlyph,
  ReasonBrowsingGlyph,
} from "@/components/ui/glyphs";

export type GlyphComponent = React.ComponentType<{ className?: string }>;

export const VISIT_REASONS: ReadonlyArray<{
  value: string;
  label: string;
  Glyph: GlyphComponent;
}> = [
  { value: "new_purchase", label: "Nueva compra", Glyph: ReasonNewPurchaseGlyph },
  { value: "rebuy", label: "Recompra", Glyph: ReasonRebuyGlyph },
  { value: "gift", label: "Regalo", Glyph: ReasonGiftGlyph },
  { value: "concern", label: "Preocupación", Glyph: ReasonConcernGlyph },
  { value: "promotion", label: "Promoción", Glyph: ReasonPromotionGlyph },
  { value: "browsing", label: "Exploración", Glyph: ReasonBrowsingGlyph },
];
