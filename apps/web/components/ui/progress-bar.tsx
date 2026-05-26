import { cn } from "@/lib/utils";

export type ProgressTone = "neutral" | "success" | "warning" | "danger";

interface ProgressBarProps {
  /** 0..100. Values >100 cap visually but the label keeps the real number. */
  value: number;
  /** Optional tone override; otherwise derived from value when `auto` is true. */
  tone?: ProgressTone;
  /**
   * When true (default) the tone is auto-mapped:
   * danger <70%, warning 70-89%, success ≥90%.
   */
  auto?: boolean;
  /** Bar height in px (default 12 — meaty enough for iPad reading at a glance). */
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
}

const TONE_BG: Record<ProgressTone, string> = {
  neutral: "bg-muted-foreground/60",
  success: "bg-[var(--color-success,oklch(0.52_0.17_150))]",
  warning: "bg-[var(--color-warning,oklch(0.75_0.15_65))]",
  danger: "bg-destructive",
};

const SIZE_CLS = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

export function ProgressBar({
  value,
  tone,
  auto = true,
  size = "md",
  className,
  ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const resolvedTone: ProgressTone =
    tone ??
    (auto
      ? value >= 90
        ? "success"
        : value >= 70
          ? "warning"
          : "danger"
      : "neutral");

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        SIZE_CLS[size],
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300 ease-out",
          TONE_BG[resolvedTone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
