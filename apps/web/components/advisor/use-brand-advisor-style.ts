import type { CSSProperties } from "react";
import { useBrand } from "@/lib/hooks/use-brands";

/**
 * Paints the BA sidebar with the brand's real colors: primary fills the
 * sidebar surface and accent drives badges, active states and dots.
 * Foregrounds flip to a light off-white when the primary is dark so the
 * nav stays legible without losing the brand identity.
 *
 * Returns {} when there's no brand id or primary color so the default
 * warm-gray light tokens take over.
 */
export function useBrandAdvisorStyle(
  brandId: string | null | undefined,
): CSSProperties {
  const { data: brand } = useBrand(brandId ?? "");
  const primary = brand?.config?.primaryColor ?? brand?.primaryColor;
  const accent = brand?.config?.accentColor ?? brand?.accentColor ?? primary;
  if (!primary) return {};

  const dark = isDarkHex(primary);
  const accentColor = accent ?? primary;

  if (dark) {
    return {
      "--ba-sidebar": primary,
      "--ba-sidebar-foreground": "oklch(0.85 0.005 90)",
      "--ba-sidebar-muted": "oklch(0.60 0.01 90)",
      "--ba-sidebar-active": `color-mix(in oklab, ${accentColor} 18%, ${primary})`,
      "--ba-sidebar-border": `color-mix(in oklab, white 12%, ${primary})`,
      "--ba-accent": accentColor,
      "--ba-accent-foreground": "oklch(0.15 0.01 60)",
      "--ba-accent-soft": `color-mix(in oklab, ${accentColor} 22%, ${primary})`,
    } as CSSProperties;
  }

  return {
    "--ba-sidebar": `color-mix(in oklab, ${primary} 8%, oklch(0.972 0.004 80))`,
    "--ba-sidebar-active": `color-mix(in oklab, ${primary} 16%, oklch(0.93 0.005 80))`,
    "--ba-sidebar-border": `color-mix(in oklab, ${primary} 14%, oklch(0.92 0.003 80))`,
    "--ba-accent": accentColor,
    "--ba-accent-soft": `color-mix(in oklab, ${accentColor} 14%, white)`,
  } as CSSProperties;
}

/** Rough luminance check for hex colors so we can flip foregrounds. */
function isDarkHex(hex: string): boolean {
  const m = hex.trim().replace("#", "");
  if (m.length !== 3 && m.length !== 6) return false;
  const expand = (s: string) =>
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const full = expand(m);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // ITU-R BT.601 luma. Threshold tuned so saturated mid-tones (rose
  // Lancôme #E5275C ≈ 0.41) stay in the light tinted mode and only truly
  // dark primaries (#000000, bordeaux #5C0E2E ≈ 0.13) flip the sidebar to
  // a dark surface.
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma < 0.25;
}
