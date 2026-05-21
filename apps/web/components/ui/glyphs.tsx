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
