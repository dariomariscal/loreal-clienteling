/**
 * Monoline glyphs (16–24px) drawn in the same hand-tuned style as
 * `illustrations.tsx`: stroke-width 1.5, `currentColor`, rounded caps and
 * joins. Used in buttons, quick actions, tab triggers and timeline dots —
 * anywhere we'd otherwise reach for lucide-react.
 *
 * Conventions:
 *   - 24×24 viewBox so the visual mass matches text at 14–16px line-heights.
 *   - `className` controls size via Tailwind (`size-4`, `size-5`, etc.) and
 *     color via `text-*`.
 *   - Always include `role="img"` and `aria-label` for screen readers.
 */

import * as React from "react";

type GlyphProps = React.SVGProps<SVGSVGElement> & {
  label?: string;
};

function Glyph({
  label,
  children,
  className,
  ...rest
}: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={!label}
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

// ── Quick action set ─────────────────────────────────────────────────

export function PurchaseGlyph(props: GlyphProps) {
  return (
    <Glyph label="Compra" {...props}>
      <path d="M5 7h14l-1.2 11.2A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7" />
    </Glyph>
  );
}

export function RecommendGlyph(props: GlyphProps) {
  return (
    <Glyph label="Recomendar" {...props}>
      <path d="M12 4l1.6 4.2L18 9.5l-3.2 2.9.9 4.4L12 14.8 8.3 16.8l.9-4.4L6 9.5l4.4-1.3L12 4Z" />
      <path d="M19 16l.6 1.4 1.4.6-1.4.6L19 20l-.6-1.4-1.4-.6 1.4-.6L19 16Z" />
    </Glyph>
  );
}

export function AppointmentGlyph(props: GlyphProps) {
  return (
    <Glyph label="Cita" {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </Glyph>
  );
}

export function NoteGlyph(props: GlyphProps) {
  return (
    <Glyph label="Nota" {...props}>
      <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M15 4v5h5" />
      <path d="M7 13h8M7 16.5h5" />
    </Glyph>
  );
}

export function MessageGlyph(props: GlyphProps) {
  return (
    <Glyph label="Mensaje" {...props}>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M7.5 10h9M7.5 13h6" />
    </Glyph>
  );
}

// ── Profile / navigation glyphs ──────────────────────────────────────

export function BackGlyph(props: GlyphProps) {
  return (
    <Glyph label="Volver" {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Glyph>
  );
}

export function MenuGlyph(props: GlyphProps) {
  return (
    <Glyph label="Menú" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Glyph>
  );
}

export function MoreGlyph(props: GlyphProps) {
  return (
    <Glyph label="Acciones" {...props}>
      <circle cx="6" cy="12" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function CloseGlyph(props: GlyphProps) {
  return (
    <Glyph label="Cerrar" {...props}>
      <path d="M6 6l12 12M18 6l-12 12" />
    </Glyph>
  );
}

export function CheckGlyph(props: GlyphProps) {
  return (
    <Glyph label="Hecho" {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Glyph>
  );
}

export function PlusGlyph(props: GlyphProps) {
  return (
    <Glyph label="Añadir" {...props}>
      <path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}

export function MinusGlyph(props: GlyphProps) {
  return (
    <Glyph label="Quitar" {...props}>
      <path d="M5 12h14" />
    </Glyph>
  );
}

export function SearchGlyph(props: GlyphProps) {
  return (
    <Glyph label="Buscar" {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </Glyph>
  );
}

export function ChevronRightGlyph(props: GlyphProps) {
  return (
    <Glyph label="Siguiente" {...props}>
      <path d="M9 6l6 6-6 6" />
    </Glyph>
  );
}

export function ChevronDownGlyph(props: GlyphProps) {
  return (
    <Glyph label="Expandir" {...props}>
      <path d="M6 9l6 6 6-6" />
    </Glyph>
  );
}

export function ChevronUpGlyph(props: GlyphProps) {
  return (
    <Glyph label="Contraer" {...props}>
      <path d="M6 15l6-6 6 6" />
    </Glyph>
  );
}

// ── Delta indicators (KPI cards) ─────────────────────────────────────

export function ArrowUpGlyph(props: GlyphProps) {
  return (
    <Glyph label="Subió" {...props}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Glyph>
  );
}

export function ArrowDownGlyph(props: GlyphProps) {
  return (
    <Glyph label="Bajó" {...props}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </Glyph>
  );
}

// ── Trust / privacy glyphs ───────────────────────────────────────────

export function LockGlyph(props: GlyphProps) {
  return (
    <Glyph label="Privada" {...props}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </Glyph>
  );
}

// ── Beauty profile glyphs ────────────────────────────────────────────
// Skin types, concerns, fragrance families, routines, interests and shade
// categories. Same monoline 24×24 vocabulary as the rest of the file — they
// replace the emoji set previously used in beauty-section, beauty-wizard
// and shade-sheet so the luxury editorial system stays consistent.

// ── Skin types ───────────────────────────────────────────────────────

export function SkinDryGlyph(props: GlyphProps) {
  return (
    <Glyph label="Piel seca" {...props}>
      <path d="M12 4c2.5 3 4.5 5.5 4.5 8.5a4.5 4.5 0 1 1-9 0c0-3 2-5.5 4.5-8.5Z" />
      <path d="M10 12.5c.5 1 1.5 1.5 2.5 1.5" opacity="0.6" />
    </Glyph>
  );
}

export function SkinOilyGlyph(props: GlyphProps) {
  return (
    <Glyph label="Piel grasa" {...props}>
      <path d="M12 4c2.5 3 4.5 5.5 4.5 8.5a4.5 4.5 0 1 1-9 0c0-3 2-5.5 4.5-8.5Z" />
      <circle cx="10" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function SkinCombinationGlyph(props: GlyphProps) {
  return (
    <Glyph label="Piel mixta" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" opacity="0.15" stroke="none" />
    </Glyph>
  );
}

export function SkinSensitiveGlyph(props: GlyphProps) {
  return (
    <Glyph label="Piel sensible" {...props}>
      <path d="M12 4c2.5 3 4.5 5.5 4.5 8.5a4.5 4.5 0 1 1-9 0c0-3 2-5.5 4.5-8.5Z" />
      <path d="M9 19l1.5-2M12 20v-2M15 19l-1.5-2" opacity="0.7" />
    </Glyph>
  );
}

export function SkinNormalGlyph(props: GlyphProps) {
  return (
    <Glyph label="Piel normal" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12h6" />
    </Glyph>
  );
}

// ── Skin concerns ────────────────────────────────────────────────────

export function ConcernAcneGlyph(props: GlyphProps) {
  return (
    <Glyph label="Acné" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="9" cy="10" r="1" fill="currentColor" opacity="0.4" stroke="none" />
      <circle cx="14" cy="9.5" r="0.7" fill="currentColor" opacity="0.4" stroke="none" />
      <circle cx="13" cy="14" r="1.1" fill="currentColor" opacity="0.4" stroke="none" />
      <circle cx="10" cy="14.5" r="0.7" fill="currentColor" opacity="0.4" stroke="none" />
    </Glyph>
  );
}

export function ConcernAgingGlyph(props: GlyphProps) {
  return (
    <Glyph label="Anti-edad" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M7 10c1.5-.6 3-.6 5 0s3.5.6 5 0" opacity="0.7" />
      <path d="M7.5 13.5c1.5-.6 3-.6 5 0s3-.6 4 0" opacity="0.7" />
      <path d="M9 16.5c1-.4 2-.4 3 0s2 .4 3 0" opacity="0.7" />
    </Glyph>
  );
}

export function ConcernPigmentationGlyph(props: GlyphProps) {
  return (
    <Glyph label="Pigmentación" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="9.5" cy="10" r="1.3" fill="currentColor" opacity="0.25" stroke="none" />
      <circle cx="14.5" cy="13" r="1.6" fill="currentColor" opacity="0.25" stroke="none" />
      <circle cx="10.5" cy="15" r="1" fill="currentColor" opacity="0.25" stroke="none" />
    </Glyph>
  );
}

export function ConcernDrynessGlyph(props: GlyphProps) {
  return (
    <Glyph label="Hidratación" {...props}>
      <path d="M12 4c2.8 3.5 5 6.2 5 9.5a5 5 0 1 1-10 0c0-3.3 2.2-6 5-9.5Z" />
      <path d="M10 13a2 2 0 0 0 2 2" opacity="0.6" />
    </Glyph>
  );
}

export function ConcernSensitivityGlyph(props: GlyphProps) {
  return (
    <Glyph label="Sensibilidad" {...props}>
      <path d="M12 5c-1.5 2-3 3-3 5.5 0 1.5 1 2.5 3 2.5s3-1 3-2.5C15 8 13.5 7 12 5Z" />
      <path d="M12 13v6" />
      <path d="M9 16.5c1-1 2-1 3-1s2 0 3 1" opacity="0.6" />
    </Glyph>
  );
}

export function ConcernPoresGlyph(props: GlyphProps) {
  return (
    <Glyph label="Poros" {...props}>
      <circle cx="8.5" cy="8.5" r="1.2" />
      <circle cx="15.5" cy="8.5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="8.5" cy="15.5" r="1.2" />
      <circle cx="15.5" cy="15.5" r="1.2" />
    </Glyph>
  );
}

export function ConcernDarkCirclesGlyph(props: GlyphProps) {
  return (
    <Glyph label="Ojeras" {...props}>
      <path d="M3.5 12c2.5-4 5.5-6 8.5-6s6 2 8.5 6c-2.5 4-5.5 6-8.5 6s-6-2-8.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M5.5 15.5c1.5 1.5 3.5 2.5 6.5 2.5s5-1 6.5-2.5" opacity="0.4" />
    </Glyph>
  );
}

export function ConcernRednessGlyph(props: GlyphProps) {
  return (
    <Glyph label="Rojeces" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 9.5c1.5.4 2.5.4 4 0M12 9.5c1.5.4 2.5.4 4 0" opacity="0.6" />
      <path d="M7.5 13c2 .5 4 .5 6 0s3 0 4 0" opacity="0.6" />
      <path d="M9 16c1.5.4 3 .4 4.5 0" opacity="0.6" />
    </Glyph>
  );
}

// ── Fragrance families ───────────────────────────────────────────────

export function FragranceFloralGlyph(props: GlyphProps) {
  return (
    <Glyph label="Floral" {...props}>
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="12" r="2.5" />
      <circle cx="12" cy="16.5" r="2.5" />
      <circle cx="7.5" cy="12" r="2.5" />
    </Glyph>
  );
}

export function FragranceWoodyGlyph(props: GlyphProps) {
  return (
    <Glyph label="Amaderada" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="5" opacity="0.6" />
      <circle cx="12" cy="12" r="2.5" opacity="0.4" />
      <path d="M12 4v3M19.5 9l-2.5 1M19.5 15l-2.5-1M12 20v-3M4.5 15l2.5-1M4.5 9l2.5 1" opacity="0.5" />
    </Glyph>
  );
}

export function FragranceCitrusGlyph(props: GlyphProps) {
  return (
    <Glyph label="Cítrica" {...props}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5v14M5 12h14" opacity="0.6" />
      <path d="M7 7l10 10M17 7 7 17" opacity="0.4" />
    </Glyph>
  );
}

export function FragranceOrientalGlyph(props: GlyphProps) {
  return (
    <Glyph label="Oriental" {...props}>
      <path d="M8 19h8" />
      <path d="M9 19v-6h6v6" />
      <path d="M10.5 13V9.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M12 5v2.5" />
      <path d="M10.5 6 12 4.5 13.5 6" opacity="0.6" />
    </Glyph>
  );
}

export function FragranceFreshGlyph(props: GlyphProps) {
  return (
    <Glyph label="Fresca" {...props}>
      <path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 13c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" opacity="0.7" />
      <path d="M3 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" opacity="0.5" />
    </Glyph>
  );
}

export function FragranceGourmandGlyph(props: GlyphProps) {
  return (
    <Glyph label="Gourmand" {...props}>
      <path d="M8 11c0-2 1.5-4 4-4s4 2 4 4v1H8v-1Z" />
      <path d="M7 12h10l-1 7H8l-1-7Z" />
      <path d="M10 7c.5-1 1-1.5 2-1.5s1.5.5 2 1.5" opacity="0.5" />
    </Glyph>
  );
}

// ── Routine ──────────────────────────────────────────────────────────

export function RoutineMorningGlyph(props: GlyphProps) {
  return (
    <Glyph label="Rutina AM" {...props}>
      <circle cx="12" cy="13" r="3.5" />
      <path d="M12 6.5V4M17.5 8.5 19 7M19.5 13H22M4.5 13H2M5 7l1.5 1.5" />
      <path d="M4 18h16" opacity="0.7" />
    </Glyph>
  );
}

export function RoutineNightGlyph(props: GlyphProps) {
  return (
    <Glyph label="Rutina PM" {...props}>
      <path d="M18 14.5A7 7 0 0 1 9.5 6a7 7 0 1 0 8.5 8.5Z" />
      <circle cx="16" cy="7" r="0.5" fill="currentColor" stroke="none" opacity="0.6" />
      <circle cx="19" cy="10" r="0.5" fill="currentColor" stroke="none" opacity="0.6" />
    </Glyph>
  );
}

export function RoutineBothGlyph(props: GlyphProps) {
  return (
    <Glyph label="AM + PM" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" opacity="0.2" stroke="none" />
      <path d="M12 4v16" opacity="0.4" />
    </Glyph>
  );
}

// ── Interests ────────────────────────────────────────────────────────

export function InterestSkincareGlyph(props: GlyphProps) {
  return (
    <Glyph label="Skincare" {...props}>
      <path d="M9 4h6v3l1.5 2v10a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V9L9 7V4Z" />
      <path d="M9 11h6" opacity="0.6" />
      <path d="M11 14h2" opacity="0.5" />
    </Glyph>
  );
}

export function InterestMakeupGlyph(props: GlyphProps) {
  return (
    <Glyph label="Maquillaje" {...props}>
      <path d="M10 4h4v5l-1 1v8a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1v-8l-1-1V4Z" />
      <path d="M10 9h4" opacity="0.6" />
    </Glyph>
  );
}

export function InterestFragranceGlyph(props: GlyphProps) {
  return (
    <Glyph label="Fragancia" {...props}>
      <path d="M9 9h6v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V9Z" />
      <path d="M10 6.5h4v2.5h-4z" />
      <path d="M11 4h2v2.5h-2z" />
      <path d="M16.5 11c.8 0 1.5-.7 1.5-1.5S17.3 8 16.5 8" opacity="0.5" />
    </Glyph>
  );
}

// ── Shade categories (makeup product types) ──────────────────────────

export function ShadeFoundationGlyph(props: GlyphProps) {
  return (
    <Glyph label="Base" {...props}>
      <path d="M9 4h6v3l1.5 1.5v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-10L9 7V4Z" />
      <path d="M9 11h6" opacity="0.5" />
    </Glyph>
  );
}

export function ShadeConcealerGlyph(props: GlyphProps) {
  return (
    <Glyph label="Corrector" {...props}>
      <path d="M14 4 19 9l-9.5 9.5L4.5 20l1.5-5L14 4Z" />
      <path d="m13 5 5 5" opacity="0.6" />
      <path d="m6 15 3 3" opacity="0.4" />
    </Glyph>
  );
}

export function ShadeLipstickGlyph(props: GlyphProps) {
  return (
    <Glyph label="Labial" {...props}>
      <path d="M9 11h6v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-9Z" />
      <path d="M10 11V6l2-2 2 2v5" />
      <path d="M9 14h6" opacity="0.5" />
    </Glyph>
  );
}

export function ShadeBlushGlyph(props: GlyphProps) {
  return (
    <Glyph label="Rubor" {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="4" opacity="0.4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.3" stroke="none" />
    </Glyph>
  );
}

// ── Note tags ────────────────────────────────────────────────────────

export function TagPreferenceGlyph(props: GlyphProps) {
  return (
    <Glyph label="Preferencia" {...props}>
      <path d="M12 5l1.8 4.5 4.7.4-3.6 3 1.1 4.6L12 15.5 7.9 17.5 9 12.9 5.5 9.9l4.7-.4L12 5Z" />
    </Glyph>
  );
}

export function TagAllergyGlyph(props: GlyphProps) {
  return (
    <Glyph label="Alergia" {...props}>
      <path d="M12 4 3 19h18L12 4Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function TagEventGlyph(props: GlyphProps) {
  return (
    <Glyph label="Evento" {...props}>
      <path d="M12 4l8 8-8 8-8-8 8-8Z" />
      <path d="M9 12c1.5-1 4.5-1 6 0" opacity="0.6" />
      <circle cx="12" cy="9" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function TagObjectionGlyph(props: GlyphProps) {
  return (
    <Glyph label="Objeción" {...props}>
      <path d="M5 6h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-4l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      <path d="M10.5 10.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5c0 1-1.5 1-1.5 2" />
      <circle cx="12" cy="14" r="0.5" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function TagFollowupGlyph(props: GlyphProps) {
  return (
    <Glyph label="Seguimiento" {...props}>
      <path d="M12 4v8" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 14v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
    </Glyph>
  );
}

// ── Visit reasons (recommendation flow) ──────────────────────────────

export function ReasonNewPurchaseGlyph(props: GlyphProps) {
  return (
    <Glyph label="Nueva compra" {...props}>
      <path d="M5 8h14l-1 11H6L5 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M11 12v3M9.5 13.5h3" opacity="0.6" />
    </Glyph>
  );
}

export function ReasonRebuyGlyph(props: GlyphProps) {
  return (
    <Glyph label="Recompra" {...props}>
      <path d="M5 11a7 7 0 0 1 12-4l2 2" />
      <path d="M19 5v4h-4" />
      <path d="M19 13a7 7 0 0 1-12 4l-2-2" />
      <path d="M5 19v-4h4" />
    </Glyph>
  );
}

export function ReasonGiftGlyph(props: GlyphProps) {
  return (
    <Glyph label="Regalo" {...props}>
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <path d="M3 9h18M12 9v11" />
      <path d="M12 9c-1.5-1.5-3-2-4-1.5s-.5 2 1 2.5h3Z" />
      <path d="M12 9c1.5-1.5 3-2 4-1.5s.5 2-1 2.5h-3Z" />
    </Glyph>
  );
}

export function ReasonConcernGlyph(props: GlyphProps) {
  return (
    <Glyph label="Preocupación" {...props}>
      <path d="M5 6h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-4l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      <path d="M9 10h6M9 13h4" opacity="0.6" />
    </Glyph>
  );
}

export function ReasonPromotionGlyph(props: GlyphProps) {
  return (
    <Glyph label="Promoción" {...props}>
      <path d="M12 4l1.6 4.2L18 9.5l-3.2 2.9.9 4.4L12 14.8 8.3 16.8l.9-4.4L6 9.5l4.4-1.3L12 4Z" />
      <path d="M19 17l.5 1.2L20.5 18.5l-1 .5L19 20l-.5-1-1-.5 1-.5L19 17Z" opacity="0.7" />
    </Glyph>
  );
}

export function ReasonBrowsingGlyph(props: GlyphProps) {
  return (
    <Glyph label="Exploración" {...props}>
      <path d="M3 12c2-4 5-6 9-6s7 2 9 6c-2 4-5 6-9 6s-7-2-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

// ── Appointment event types (services) ───────────────────────────────

export function ServiceCabinGlyph(props: GlyphProps) {
  return (
    <Glyph label="Servicio en cabina" {...props}>
      <path d="M12 4l1.6 4.2L18 9.5l-3.2 2.9.9 4.4L12 14.8 8.3 16.8l.9-4.4L6 9.5l4.4-1.3L12 4Z" />
    </Glyph>
  );
}

export function ServiceFacialGlyph(props: GlyphProps) {
  return (
    <Glyph label="Facial" {...props}>
      <path d="M7 12c0-3.5 2.2-6 5-6s5 2.5 5 6c0 2-1 4-2.5 5-1 .7-1.5 1.3-1.5 2v1h-2v-1c0-.7-.5-1.3-1.5-2C8 16 7 14 7 12Z" />
      <path d="M5.5 11c.5-.5 1-.5 1.5 0M17 11c.5-.5 1-.5 1.5 0" opacity="0.6" />
      <circle cx="10.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function ServiceAnniversaryGlyph(props: GlyphProps) {
  return (
    <Glyph label="Aniversario" {...props}>
      <rect x="4" y="10" width="16" height="10" rx="1" />
      <path d="M3 10h18M12 10v10" />
      <path d="M12 10c-1.5-1.5-3-2-4-1.5s-.5 2 1 2.5h3Z" />
      <path d="M12 10c1.5-1.5 3-2 4-1.5s.5 2-1 2.5h-3Z" />
      <path d="M8 6l1 2M16 6l-1 2M12 4v2.5" opacity="0.6" />
    </Glyph>
  );
}

export function ServiceVipCabinGlyph(props: GlyphProps) {
  return (
    <Glyph label="Cabina VIP" {...props}>
      <path d="M4 17h16l-1.5-9-3.5 3-3-5-3 5-3.5-3L4 17Z" />
      <circle cx="6" cy="7" r="1" />
      <circle cx="12" cy="4.5" r="1" />
      <circle cx="18" cy="7" r="1" />
      <path d="M5 19h14" opacity="0.6" />
    </Glyph>
  );
}

export function ServiceProductFollowupGlyph(props: GlyphProps) {
  return (
    <Glyph label="Seguimiento de producto" {...props}>
      <path d="M4 8l8-4 8 4-8 4-8-4Z" />
      <path d="M4 8v8l8 4V12" />
      <path d="M20 8v8l-8 4" />
      <path d="M8 6l8 4" opacity="0.5" />
    </Glyph>
  );
}

export function ServiceCustomGlyph(props: GlyphProps) {
  return (
    <Glyph label="Personalizado" {...props}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" />
      <circle cx="12" cy="12" r="2.5" />
    </Glyph>
  );
}

// ── Followup types (BA today) ────────────────────────────────────────

export function FollowupBirthdayGlyph(props: GlyphProps) {
  return (
    <Glyph label="Cumpleaños" {...props}>
      <path d="M5 13h14v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6Z" />
      <path d="M5 13c0-1.5 1-2.5 3-2.5h8c2 0 3 1 3 2.5" />
      <path d="M9 10.5V8M12 10.5V7M15 10.5V8" />
      <circle cx="9" cy="7" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function FollowupReplenishmentGlyph(props: GlyphProps) {
  return (
    <Glyph label="Reposición" {...props}>
      <path d="M5 7h14l-1 12H6L5 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
      <path d="M5 11h14" opacity="0.5" />
    </Glyph>
  );
}

export function FollowupSpecialEventGlyph(props: GlyphProps) {
  return (
    <Glyph label="Evento especial" {...props}>
      <path d="M12 4l1.6 4.2L18 9.5l-3.2 2.9.9 4.4L12 14.8 8.3 16.8l.9-4.4L6 9.5l4.4-1.3L12 4Z" />
    </Glyph>
  );
}

export function FollowupCheckInGlyph(props: GlyphProps) {
  return (
    <Glyph label="Check-in" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Glyph>
  );
}

export function FollowupGeneralGlyph(props: GlyphProps) {
  return (
    <Glyph label="Seguimiento" {...props}>
      <path d="M5 6h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-4l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      <circle cx="9" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

// ── System / utility glyphs (replace lucide-react) ───────────────────
// Same monoline 24×24 vocabulary. Apply to anything that was previously
// pulling from lucide-react so the app speaks a single icon language.

export function SpinnerGlyph(props: GlyphProps) {
  // Three-quarter ring with a rounded gap. Rotate via `animate-spin`.
  return (
    <Glyph {...props}>
      <path d="M12 4a8 8 0 1 1-5.66 2.34" />
    </Glyph>
  );
}

export function MapPinGlyph(props: GlyphProps) {
  return (
    <Glyph label="Ubicación" {...props}>
      <path d="M12 3c4 0 7 3 7 7 0 5-7 11-7 11S5 15 5 10c0-4 3-7 7-7Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Glyph>
  );
}

export function UploadCloudGlyph(props: GlyphProps) {
  return (
    <Glyph label="Subir" {...props}>
      <path d="M6 17h12a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.7-1.5A4 4 0 0 0 6 17Z" />
      <path d="M12 13v6" />
      <path d="M9 16l3-3 3 3" />
    </Glyph>
  );
}

export function ImageGlyph(props: GlyphProps) {
  return (
    <Glyph label="Imagen" {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 17 5-5 5 5 3-3 3 3" />
    </Glyph>
  );
}

export function AlertCircleGlyph(props: GlyphProps) {
  return (
    <Glyph label="Alerta" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function CheckCircleGlyph(props: GlyphProps) {
  return (
    <Glyph label="Listo" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12.5l3 3 5-6" />
    </Glyph>
  );
}

export function DownloadGlyph(props: GlyphProps) {
  return (
    <Glyph label="Descargar" {...props}>
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </Glyph>
  );
}

export function KeyRoundGlyph(props: GlyphProps) {
  return (
    <Glyph label="Contraseña" {...props}>
      <circle cx="8" cy="14" r="3.5" />
      <path d="M10.5 11.5 19 3" />
      <path d="M16 6l2.5 2.5" />
      <path d="M14 8l2 2" />
    </Glyph>
  );
}

export function CopyGlyph(props: GlyphProps) {
  return (
    <Glyph label="Copiar" {...props}>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </Glyph>
  );
}

export function StoreGlyph(props: GlyphProps) {
  return (
    <Glyph label="Tienda" {...props}>
      <path d="M4 9l1-4h14l1 4" />
      <path d="M4 9c0 1.4 1.1 2.5 2.5 2.5S9 10.4 9 9c0 1.4 1.1 2.5 2.5 2.5S14 10.4 14 9c0 1.4 1.1 2.5 2.5 2.5S19 10.4 19 9" />
      <path d="M5 11v8h14v-8" />
      <rect x="10" y="14" width="4" height="5" />
    </Glyph>
  );
}

export function PencilGlyph(props: GlyphProps) {
  return (
    <Glyph label="Editar" {...props}>
      <path d="M14 4 19 9l-9.5 9.5L4.5 20l1.5-5L14 4Z" />
      <path d="m13 5 5 5" opacity="0.6" />
    </Glyph>
  );
}

export function StarGlyph(props: GlyphProps) {
  return (
    <Glyph label="Favorito" {...props}>
      <path d="M12 4l1.8 4.5 4.7.4-3.6 3 1.1 4.6L12 15.5 7.9 17.5 9 12.9 5.5 9.9l4.7-.4L12 4Z" />
    </Glyph>
  );
}

export function StarSolidGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path
        d="M12 4l1.8 4.5 4.7.4-3.6 3 1.1 4.6L12 15.5 7.9 17.5 9 12.9 5.5 9.9l4.7-.4L12 4Z"
        fill="currentColor"
      />
    </Glyph>
  );
}

export function TrashGlyph(props: GlyphProps) {
  return (
    <Glyph label="Eliminar" {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v6M14 11v6" opacity="0.5" />
    </Glyph>
  );
}

export function TagGlyph(props: GlyphProps) {
  return (
    <Glyph label="Etiqueta" {...props}>
      <path d="M4 4h7l9 9-7 7-9-9V4Z" />
      <circle cx="8" cy="8" r="1.2" />
    </Glyph>
  );
}

export function UserGlyph(props: GlyphProps) {
  return (
    <Glyph label="Usuario" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </Glyph>
  );
}

export function UserPlusGlyph(props: GlyphProps) {
  return (
    <Glyph label="Nueva clienta" {...props}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <path d="M18 5v6M15 8h6" />
    </Glyph>
  );
}

export function PackageGlyph(props: GlyphProps) {
  return (
    <Glyph label="Producto" {...props}>
      <path d="M4 8l8-4 8 4-8 4-8-4Z" />
      <path d="M4 8v8l8 4V12" />
      <path d="M20 8v8l-8 4" />
      <path d="M8 6l8 4" opacity="0.5" />
    </Glyph>
  );
}

export function HeartGlyph(props: GlyphProps) {
  return (
    <Glyph label="Recomendación" {...props}>
      <path d="M12 19s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 9c0 5.5-7 10-7 10Z" />
    </Glyph>
  );
}

export function CalendarPlusGlyph(props: GlyphProps) {
  return (
    <Glyph label="Nueva cita" {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="M12 12v5M9.5 14.5h5" />
    </Glyph>
  );
}

export function EyeGlyph(props: GlyphProps) {
  return (
    <Glyph label="Mostrar contraseña" {...props}>
      <path d="M3 12c2-4 5-6 9-6s7 2 9 6c-2 4-5 6-9 6s-7-2-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </Glyph>
  );
}

export function EyeOffGlyph(props: GlyphProps) {
  return (
    <Glyph label="Ocultar contraseña" {...props}>
      <path d="M4 5l16 14" />
      <path d="M9.5 7.5C6.5 8.5 4 10.5 3 12c2 4 5 6 9 6 1.5 0 2.8-.3 4-.8" />
      <path d="M14.5 16.5C17.5 15.5 20 13.5 21 12c-1.5-3-3.7-4.8-6.5-5.6" />
      <path d="M10 10.5a2.5 2.5 0 0 0 3.5 3.5" />
    </Glyph>
  );
}

// ── Channel glyphs (overlay on avatars in message lists) ────────────
// Each one is a single-color monoline mark sized for a 14px overlay
// circle. Color is applied via `text-*` from the caller — these stay
// monochrome to avoid the platform-logo-zoo effect.

export function SignOutGlyph(props: GlyphProps) {
  return (
    <Glyph label="Cerrar sesión" {...props}>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h10" />
    </Glyph>
  );
}

export function SettingsGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Glyph>
  );
}

export function ActivityGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </Glyph>
  );
}

export function EmailDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <path d="m4 8 8 5 8-5" />
    </Glyph>
  );
}

export function SmsDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M4 5h16v11H10l-4 3v-3H4V5Z" />
    </Glyph>
  );
}

export function WhatsappDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5 20l1.4-4.2a8 8 0 1 1 2.8 2.8L5 20Z" />
      <path d="M9.5 10c.5 2.5 2 4 4.5 4.5l1-1.5 2 .8a4 4 0 0 1-5.3 1A6 6 0 0 1 8 9.5l.8 2 1.5-1Z" />
    </Glyph>
  );
}

// ── Timeline event glyphs (12–16px) ──────────────────────────────────
// Tiny variants for use inside the timeline dot. Same style but more
// compact; rendered without the "more details" elements.

export function PurchaseDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5 7h14l-1 11H6L5 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </Glyph>
  );
}

export function SparkleDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 4v6M12 14v6M4 12h6M14 12h6" />
    </Glyph>
  );
}

export function CalendarDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="4" y="6" width="16" height="14" rx="1.5" />
      <path d="M4 10h16M9 4v4M15 4v4" />
    </Glyph>
  );
}

export function NoteDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5 4h10l4 4v12H5V4Z" />
      <path d="M15 4v4h4" />
    </Glyph>
  );
}

export function MessageDotGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M4 5h16v12h-9l-4 3v-3H4V5Z" />
    </Glyph>
  );
}

// ── National Retail Manager glyphs ───────────────────────────────────
// These represent the NRM-specific concepts (executive pulse, multi-zone,
// team rollup, brand identity, channel templates, segment Venn, audit
// activity, choropleth canvas). Drawn in the same monoline 24×24 style.

export function PulseGlyph(props: GlyphProps) {
  // Heart-rate line — executive "national pulse" at a glance.
  return (
    <Glyph label="Pulso" {...props}>
      <path d="M3 12h4l2-5 3 10 2-7 2 4 1-2h4" />
    </Glyph>
  );
}

export function ZonesGlyph(props: GlyphProps) {
  // Three contiguous polygonal cells — multiple zones tiled together.
  return (
    <Glyph label="Zonas" {...props}>
      <path d="M4 5h7l2 4-2 4H4V5Z" />
      <path d="M13 9l4-4h3v8h-5l-2-4Z" />
      <path d="M9 13l2 4h6l3 3H6l-2-3 5-4Z" opacity="0.85" />
    </Glyph>
  );
}

export function TeamGlyph(props: GlyphProps) {
  // Three silhouettes — group/team distinct from single UserGlyph.
  return (
    <Glyph label="Equipo" {...props}>
      <circle cx="8" cy="9" r="2.5" />
      <circle cx="16" cy="9" r="2.5" />
      <circle cx="12" cy="7.5" r="2.5" />
      <path d="M3.5 18c.6-2.4 2.4-4 4.5-4M20.5 18c-.6-2.4-2.4-4-4.5-4" />
      <path d="M6.5 20c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
    </Glyph>
  );
}

export function BrandGlyph(props: GlyphProps) {
  // Paint palette + droplet — visual identity / brand tokens.
  return (
    <Glyph label="Marca" {...props}>
      <path d="M12 3.5c-4.7 0-8.5 3.5-8.5 7.8 0 3.3 2.3 5.7 5.5 5.7 1.4 0 2-.7 2-1.6 0-.6-.4-1.1-.4-1.7 0-.9.7-1.6 1.6-1.6h2.4c2.7 0 4.9-2.2 4.9-4.9 0-2-2.5-3.7-7.5-3.7Z" />
      <circle cx="8" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function TemplateGlyph(props: GlyphProps) {
  // Document with folded corner + structured body lines — message template.
  return (
    <Glyph label="Plantilla" {...props}>
      <path d="M5 3h10l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M15 3v4h4" />
      <path d="M7 11h8M7 14h8M7 17h5" />
    </Glyph>
  );
}

export function SegmentGlyph(props: GlyphProps) {
  // Two overlapping circles — Venn diagram, the segment-builder mental model.
  return (
    <Glyph label="Segmento" {...props}>
      <circle cx="9.5" cy="12" r="5.5" />
      <circle cx="14.5" cy="12" r="5.5" />
    </Glyph>
  );
}

export function HeatmapGlyph(props: GlyphProps) {
  // 3×3 grid with two cells filled — geographic density visualization.
  return (
    <Glyph label="Mapa de calor" {...props}>
      <rect x="4" y="4" width="5" height="5" rx="0.8" />
      <rect
        x="10"
        y="4"
        width="5"
        height="5"
        rx="0.8"
        fill="currentColor"
        stroke="none"
        opacity="0.85"
      />
      <rect x="16" y="4" width="4" height="5" rx="0.8" opacity="0.5" />
      <rect x="4" y="10" width="5" height="5" rx="0.8" opacity="0.5" />
      <rect
        x="10"
        y="10"
        width="5"
        height="5"
        rx="0.8"
        fill="currentColor"
        stroke="none"
      />
      <rect x="16" y="10" width="4" height="5" rx="0.8" />
      <rect x="4" y="16" width="5" height="4" rx="0.8" opacity="0.5" />
      <rect x="10" y="16" width="5" height="4" rx="0.8" opacity="0.5" />
      <rect x="16" y="16" width="4" height="4" rx="0.8" />
    </Glyph>
  );
}


// ── Visit glyphs ────────────────────────────────────────────
// Storefront silhouette for "iniciar visita". Pairs with the existing
// AppointmentGlyph / PurchaseGlyph so the customer 360 quick-action row
// reads as one editorial set.

export function VisitGlyph(props: GlyphProps) {
  return (
    <Glyph label="Visita" {...props}>
      <path d="M3.5 8.5 5 4.5h14l1.5 4" />
      <path d="M3.5 8.5h17V20a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V8.5Z" />
      <path d="M9.5 21v-5.5a2.5 2.5 0 0 1 5 0V21" />
    </Glyph>
  );
}

export function VisitActiveGlyph(props: GlyphProps) {
  return (
    <Glyph label="Visita en curso" {...props}>
      <path d="M3.5 8.5 5 4.5h14l1.5 4" />
      <path d="M3.5 8.5h17V20a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V8.5Z" />
      <circle cx="12" cy="14" r="2.5" fill="currentColor" stroke="none" />
    </Glyph>
  );
}
