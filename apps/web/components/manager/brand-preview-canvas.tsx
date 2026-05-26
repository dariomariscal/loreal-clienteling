"use client";

import { cn } from "@/lib/utils";
import { StoreGlyph, SparkleDotGlyph } from "@/components/ui/glyphs";

export interface BrandTokens {
  primaryColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  displayName: string;
}

interface BrandPreviewCanvasProps {
  tokens: BrandTokens;
  className?: string;
}

/**
 * Live, miniature "fake product" canvas that re-skins itself from a brand's
 * tokens — the editor concept popularized by Tokens Studio for Figma. Lets
 * the NRM see the impact of a color/logo change without leaving the form
 * or opening a separate preview page.
 *
 * What's painted:
 *   - A muted sidebar with the brand mark + a fake nav entry that picks up
 *     the primary color as its "active" state.
 *   - A KPI card whose accent line uses the accent color.
 *   - A primary button + an outline button using the same tokens.
 *   - A "VIP" badge whose background is the accent color.
 *
 * The whole canvas is purely presentational — no interactivity, no data
 * fetching — so dropping it into a sheet/section is cheap.
 */
export function BrandPreviewCanvas({
  tokens,
  className,
}: BrandPreviewCanvasProps) {
  const primary = sanitizeColor(tokens.primaryColor) ?? "#1a1a1a";
  const accent = sanitizeColor(tokens.accentColor) ?? "#c8a04d";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted/30",
        className,
      )}
      aria-label="Vista previa de la marca"
    >
      <div className="grid grid-cols-[88px_minmax(0,1fr)] min-h-[260px]">
        {/* Mini-sidebar */}
        <div
          className="flex flex-col gap-2 p-3"
          style={{ backgroundColor: primary }}
        >
          <div className="flex h-10 items-center justify-center rounded-md bg-white/10">
            {tokens.logoUrl ? (
              // Static preview — no domain whitelisting needed for /next/image
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tokens.logoUrl}
                alt={tokens.displayName}
                className="max-h-7 max-w-full object-contain"
              />
            ) : (
              <span className="font-[family-name:var(--font-heading)] text-xs font-medium text-white">
                {tokens.displayName.slice(0, 6)}
              </span>
            )}
          </div>
          <FakeNavItem icon={<StoreGlyph className="size-3.5" />} active accent={accent} />
          <FakeNavItem icon={<SparkleDotGlyph className="size-3.5" />} />
          <FakeNavItem icon={<SparkleDotGlyph className="size-3.5" />} />
        </div>

        {/* Mini-content */}
        <div className="flex flex-col gap-3 bg-background p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-[family-name:var(--font-heading)] text-sm font-medium text-foreground">
              Vista previa
            </p>
            <span
              className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider text-white"
              style={{ backgroundColor: accent }}
            >
              VIP
            </span>
          </div>

          {/* KPI card */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ventas hoy
            </p>
            <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tabular-nums text-foreground">
              $128.4k
            </p>
            <div
              className="mt-2 h-1 w-full rounded-full"
              style={{
                background: `linear-gradient(to right, ${accent} 72%, var(--muted, #eee) 72%)`,
              }}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-white"
              style={{ backgroundColor: primary }}
            >
              Acción primaria
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium"
              style={{ borderColor: accent, color: accent }}
            >
              Secundaria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FakeNavItem({
  icon,
  active,
  accent,
}: {
  icon: React.ReactNode;
  active?: boolean;
  accent?: string;
}) {
  return (
    <span
      className="flex h-7 items-center justify-center rounded-md text-white/70"
      style={
        active
          ? {
              backgroundColor: "rgba(255,255,255,0.14)",
              color: accent ?? "#fff",
            }
          : undefined
      }
    >
      {icon}
    </span>
  );
}

function sanitizeColor(c?: string | null): string | null {
  if (!c) return null;
  // Accept hex / rgb()/ named — let the browser parse via inline style.
  const trimmed = c.trim();
  return trimmed.length > 0 ? trimmed : null;
}
