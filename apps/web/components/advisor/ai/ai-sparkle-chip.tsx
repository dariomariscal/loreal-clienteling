import { cn } from "@/lib/utils";
import { SparkleDotGlyph } from "@/components/ui/glyphs";

interface Props {
  /** Optional label after the sparkle. Defaults to "IA". */
  label?: string;
  /** Compact mode for inline use inside dense rows. */
  size?: "sm" | "default";
  className?: string;
}

/**
 * Always-paired sparkle + text — never sparkle alone.
 * Google Design and NN/g both warn that the icon by itself isn't
 * universally decoded, so this atom enforces the label by construction.
 */
export function AISparkleChip({ label = "IA", size = "default", className }: Props) {
  return (
    <span
      data-ai-chip
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium tracking-wide",
        "bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]",
        size === "sm"
          ? "h-4 px-1.5 text-[10px]"
          : "h-5 px-2 text-[11px]",
        className,
      )}
    >
      <SparkleDotGlyph
        className={cn(size === "sm" ? "size-2.5" : "size-3")}
        aria-hidden
      />
      <span className="uppercase">{label}</span>
    </span>
  );
}
