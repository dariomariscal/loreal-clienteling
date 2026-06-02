import { cn } from "@/lib/utils";

interface ScanShadeWashProps {
  /**
   * Hex color of the scanned variant. When null (fragrance, neutral SKU) we
   * fall back to the BA accent soft so the wash never disappears entirely.
   */
  swatchHex?: string | null;
  /** Child content sits on top of the wash. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Tonal background for the product card in the scan sheet.
 *
 * Luxury beauty apps (Lancôme, YSL Rouge Sur Mesure, Tata Cliq Luxury) tint
 * the product surface with the shade's own hex at ~10% — the single biggest
 * "premium beauty" tell vs. a flat catalog card. When the variant has no
 * shade hex (fragrance bottles, single-size skincare) we fall back to the
 * advisor accent so the gesture is consistent across categories.
 */
export function ScanShadeWash({
  swatchHex,
  children,
  className,
}: ScanShadeWashProps) {
  const hasShade = !!swatchHex;
  // Inline style: Tailwind can't JIT arbitrary hex values that originate at
  // runtime (variant.swatchHex). When no swatch is present we fall back to
  // the BA accent soft via a static utility below.
  const inline = hasShade
    ? {
        backgroundImage: `linear-gradient(180deg, ${swatchHex}1F 0%, ${swatchHex}0A 60%, transparent 100%)`,
      }
    : undefined;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        !hasShade &&
          "bg-gradient-to-b from-[color:var(--ba-accent-soft)] to-transparent",
        className,
      )}
      style={inline}
    >
      {children}
    </div>
  );
}

interface ScanSwatchDotProps {
  swatchHex: string;
  /** Display label next to the swatch (e.g. "240W"). */
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Foundation/lip/eye shade indicator. 2px ring offset by 2px in BA accent so
 * the swatch reads as the "selected/active" state without needing a tooltip.
 * `size="lg"` is used inside the sheet hero; `sm` on the recent-scans strip.
 */
export function ScanSwatchDot({
  swatchHex,
  label,
  size = "md",
  className,
}: ScanSwatchDotProps) {
  const sizeClass =
    size === "sm" ? "size-3" : size === "lg" ? "size-5" : "size-4";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background",
          sizeClass,
        )}
        style={{
          backgroundColor: swatchHex,
          // The ring inherits the BA accent — keeps the visual binding to the
          // brand even when the swatch itself is a neutral skin tone.
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ["--tw-ring-color" as string]: "var(--ba-accent)",
        }}
      />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
