"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SparkleDotGlyph } from "@/components/ui/glyphs";

interface AIContextBlockProps {
  summary?: string | null;
  generatedAt?: Date | string | null;
  isLoading?: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  className?: string;
}

// VISUAL DEVICE: callout / blockquote with left border accent.
//
// NOT a card. The Notion Help / Vitality DS guidance is explicit: callouts
// are for actionable info from outside the current context — exactly what
// an AI summary is. The left border + tinted background says "voice" not
// "feature". The sparkle dot is the only AI signifier, deliberately small.
//
// Loading shows a 3-line skeleton with shimmer. Error shows a humane
// retry invitation — never a stack trace, never "error 500".
export function AIContextBlock({
  summary,
  generatedAt,
  isLoading,
  isStreaming,
  onRegenerate,
  className,
}: AIContextBlockProps) {
  if (isLoading && !summary) {
    return <SkeletonState className={className} />;
  }

  if (!summary) {
    return (
      <EmptyState
        onRegenerate={onRegenerate}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-r-lg border-l-[3px] border-[var(--ba-accent)] bg-[var(--ba-accent-soft)]/40 px-5 py-4",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <SparkleDotGlyph className="size-3 text-[var(--ba-accent)]" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ba-accent)]">
          Resumen
        </span>
      </div>

      <p className="text-[15px] leading-[1.6] text-foreground">
        {summary}
        {isStreaming ? <BlinkingCursor /> : null}
      </p>

      {generatedAt || onRegenerate ? (
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
          {generatedAt ? <span>{formatRelative(generatedAt)}</span> : <span />}
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Regenerar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── States ──────────────────────────────────────────────────────────

function SkeletonState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-r-lg border-l-[3px] border-[var(--ba-accent)]/40 bg-[var(--ba-accent-soft)]/20 px-5 py-4",
        className,
      )}
      aria-busy="true"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <SparkleDotGlyph className="size-3 animate-pulse text-[var(--ba-accent)]/60" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ba-accent)]/60">
          Resumen
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-[92%] animate-pulse rounded bg-foreground/8" />
        <div className="h-3 w-[78%] animate-pulse rounded bg-foreground/8" />
        <div className="h-3 w-[68%] animate-pulse rounded bg-foreground/8" />
      </div>
    </div>
  );
}

function EmptyState({
  onRegenerate,
  className,
}: {
  onRegenerate?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-r-lg border-l-[3px] border-border bg-muted/40 px-5 py-4",
        className,
      )}
    >
      <p className="text-[13px] text-muted-foreground">
        Aún no hay resumen generado para esta clienta.
      </p>
      {onRegenerate ? (
        <button
          type="button"
          onClick={onRegenerate}
          className="mt-1.5 text-[12px] font-medium text-[var(--ba-accent)] transition-colors hover:underline"
        >
          Generar resumen
        </button>
      ) : null}
    </div>
  );
}

// ── Streaming cursor — for word-by-word AI streaming ───────────────

function BlinkingCursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-foreground/70 align-middle"
      style={{ animation: "ba-blink 1s steps(2) infinite" }}
    />
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatRelative(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "Recién";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}
