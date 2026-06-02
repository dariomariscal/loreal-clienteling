"use client";

import { cn } from "@/lib/utils";

interface ScanViewfinderProps {
  /**
   * State of the camera/detection loop. Drives the scan-line animation and
   * bracket color so the BA never wonders if the camera is alive.
   */
  state?: "idle" | "scanning" | "captured";
  /** Hint text shown under the cutout — e.g. "Apunta al código del producto". */
  hint?: string;
  className?: string;
}

/**
 * Pure-visual scanner overlay: dim mask + transparent cutout + L-shaped
 * corner brackets + sweeping scan line. Sits absolutely on top of the
 * camera <video> element — no DOM ownership of the camera stream.
 *
 * Bracket color uses the BA accent token (rose-gold for Lancôme, brand-tinted
 * via `useBrandAdvisorStyle`) rather than the neon green of generic scanners,
 * keeping the luxury register the rest of the advisor app sets.
 */
export function ScanViewfinder({
  state = "scanning",
  hint = "Apunta al código del producto",
  className,
}: ScanViewfinderProps) {
  return (
    <div
      data-state={state}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Dim mask. The cutout is a centered transparent rectangle achieved
          with four absolutely-positioned panels rather than a clip-path so
          rounded corners render the same on every browser. */}
      <div className="absolute inset-x-0 top-0 h-[calc(50%-92px)] bg-foreground/60" />
      <div className="absolute inset-x-0 bottom-0 h-[calc(50%-92px)] bg-foreground/60" />
      <div className="absolute left-0 top-[calc(50%-92px)] h-[184px] w-[calc(50%-150px)] bg-foreground/60" />
      <div className="absolute right-0 top-[calc(50%-92px)] h-[184px] w-[calc(50%-150px)] bg-foreground/60" />

      {/* Cutout frame — 300×184 centered. Holds the brackets and scan line. */}
      <div
        className={cn(
          "absolute left-1/2 top-1/2 h-[184px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-2xl",
          state === "captured" && "transition-colors duration-150",
        )}
      >
        <ScanBracket position="tl" />
        <ScanBracket position="tr" />
        <ScanBracket position="bl" />
        <ScanBracket position="br" />

        {state === "scanning" ? <ScanLine /> : null}

        {state === "captured" ? (
          // Brush highlight — 150 ms confirmation beat before the sheet rises.
          <div className="absolute inset-3 animate-pulse rounded-xl bg-[color:var(--ba-accent)]/30" />
        ) : null}
      </div>

      {/* Hint text below the cutout */}
      {hint ? (
        <p className="absolute left-1/2 top-[calc(50%+110px)] -translate-x-1/2 text-center text-xs font-medium tracking-wide text-background/90">
          {hint}
        </p>
      ) : null}

      <style>{`
        @keyframes scan-line-sweep {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(168px); opacity: 0; }
        }
        [data-slot="scan-line"] {
          animation: scan-line-sweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}

// ── Internal primitives ────────────────────────────────────────────

function ScanBracket({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  // Each corner is an 28×28 box with two 2px sides — the "L" shape.
  const base = "absolute size-7 border-[color:var(--ba-accent)]";
  const map: Record<typeof position, string> = {
    tl: "left-0 top-0 rounded-tl-2xl border-l-2 border-t-2",
    tr: "right-0 top-0 rounded-tr-2xl border-r-2 border-t-2",
    bl: "left-0 bottom-0 rounded-bl-2xl border-l-2 border-b-2",
    br: "right-0 bottom-0 rounded-br-2xl border-r-2 border-b-2",
  };
  return <span aria-hidden className={cn(base, map[position])} />;
}

function ScanLine() {
  return (
    <span
      data-slot="scan-line"
      aria-hidden
      className="absolute inset-x-3 top-2 block h-px bg-gradient-to-r from-transparent via-[color:var(--ba-accent)] to-transparent shadow-[0_0_8px_var(--ba-accent)]"
    />
  );
}
