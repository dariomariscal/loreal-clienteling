"use client";

import * as React from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { BulletChart } from "@/components/charts/bullet-chart";
import { cn } from "@/lib/utils";

/* ============================================================================
   Briefing-only visual primitives. Stripe-minimal aesthetic — tight tracking,
   generous whitespace, one accent color reserved for the hero KPI of each
   page. Intentionally NOT shared with the on-screen dashboards: the print
   context calls for thicker rules, larger numerals, and a different rhythm.
   ============================================================================ */

const ACCENT = "#E30613"; // L'Oréal red — reserved for hero KPIs + negative deltas
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";
const HAIRLINE = "#E8E5DD";

// ── Section primitives ─────────────────────────────────────────────

interface SectionProps {
  /** Section number ("01", "02") shown on the eyebrow. */
  index?: string;
  /** Section label ("VENTAS POR MARCA"). */
  eyebrow: string;
  /** Action title — a sentence stating the insight, not the topic. */
  title: React.ReactNode;
  /** Optional supporting context line. */
  caption?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard layout for every briefing page after the cover. Eyebrow → action
 * title → body. The action title rule is non-negotiable — it's what separates
 * an executive briefing from a status report.
 */
export function BriefingSection({
  index,
  eyebrow,
  title,
  caption,
  children,
  className,
}: SectionProps) {
  return (
    <section className={cn("briefing-page flex flex-col", className)}>
      <BriefingHeader />
      <header className="mb-8 mt-2">
        <div className="flex items-baseline gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          {index ? <span>{index}</span> : null}
          <span>{eyebrow}</span>
        </div>
        <h2
          className="mt-3 max-w-[16ch] text-[28px] font-semibold leading-[1.15] tracking-[-0.01em]"
          style={{ color: INK }}
        >
          {title}
        </h2>
        {caption ? (
          <p className="mt-2 text-sm" style={{ color: MUTED }}>
            {caption}
          </p>
        ) : null}
      </header>
      <div className="flex-1">{children}</div>
      <BriefingFooter />
    </section>
  );
}

// ── Header / footer ────────────────────────────────────────────────

export function BriefingHeader({
  monthLabel,
  scopeLabel,
}: {
  monthLabel?: string;
  scopeLabel?: string;
} = {}) {
  return (
    <div
      className="flex items-center justify-between border-b pb-3 text-[10px] font-medium uppercase tracking-[0.18em]"
      style={{ borderColor: HAIRLINE, color: MUTED }}
    >
      <span className="font-semibold" style={{ color: INK }}>
        L'Oréal México · Clienteling
      </span>
      <span>
        {monthLabel ? `${monthLabel} · ` : ""}Executive Briefing
        {scopeLabel ? ` · ${scopeLabel}` : ""}
      </span>
    </div>
  );
}

export function BriefingFooter({ confidentialFor }: { confidentialFor?: string } = {}) {
  return (
    <div
      className="mt-8 flex items-center justify-between border-t pt-3 text-[9px]"
      style={{ borderColor: HAIRLINE, color: MUTED }}
    >
      <span>
        Confidencial — Uso interno
        {confidentialFor ? ` · ${confidentialFor}` : ""}
      </span>
      <span>Definiciones en Anexo</span>
    </div>
  );
}

// ── KPI hero card ──────────────────────────────────────────────────

interface KpiHeroProps {
  label: string;
  value: string;
  /** MoM delta (-1..+∞). Drives sign + color. */
  deltaPct?: number;
  /** Trend points for the sparkline. */
  trend?: number[];
  /** Short context ("vs mayo 2026", "82 tiendas activas"). */
  helper?: string;
  /** When true the card uses the accent color for the value. Reserve to one card per page. */
  accent?: boolean;
}

/**
 * Hero KPI tile. Number-first composition with optional sparkline + MoM delta.
 * Inspired by Stripe's number-as-protagonist convention.
 */
export function KpiHero({ label, value, deltaPct, trend, helper, accent }: KpiHeroProps) {
  const deltaColor =
    deltaPct == null
      ? MUTED
      : deltaPct >= 0
        ? "#0a7d2e"
        : ACCENT;
  const deltaSign = deltaPct != null && deltaPct >= 0 ? "▲" : "▼";

  return (
    <div
      className="briefing-no-break flex flex-col gap-2 border p-5"
      style={{ borderColor: HAIRLINE }}
    >
      <span
        className="text-[10px] font-medium uppercase tracking-[0.16em]"
        style={{ color: MUTED }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-3">
        <span
          className="text-[34px] font-semibold tracking-[-0.02em] tabular-nums"
          style={{ color: accent ? ACCENT : INK }}
        >
          {value}
        </span>
        {deltaPct != null ? (
          <span
            className="text-[12px] font-medium tabular-nums"
            style={{ color: deltaColor }}
          >
            {deltaSign} {Math.abs(deltaPct * 100).toFixed(1)}%
          </span>
        ) : null}
      </div>
      {trend && trend.length > 1 ? (
        <div className="h-8">
          <Sparkline
            data={trend}
            tone={deltaPct != null && deltaPct < 0 ? "negative" : "positive"}
            height={32}
          />
        </div>
      ) : null}
      {helper ? (
        <span className="text-[11px]" style={{ color: MUTED }}>
          {helper}
        </span>
      ) : null}
    </div>
  );
}

// ── Ranking table with in-cell micro-bars ──────────────────────────

interface RankingColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Render a cell value. */
  render: (row: T) => React.ReactNode;
  /**
   * When set, the column renders a horizontal micro-bar inside the cell
   * proportional to row[key] vs the column max. The text is rendered too.
   */
  bar?: (row: T) => { value: number; max: number };
}

interface RankingTableProps<T> {
  rows: T[];
  columns: RankingColumn<T>[];
  rankBy?: (row: T) => number;
  rowKey: (row: T) => string;
}

/**
 * Table optimized for print — hairlines (not boxes), tabular-nums on every
 * numeric column, optional micro-bar in the lead numeric column. Tufte's
 * "data-ink ratio" applied to ranking rows.
 */
export function RankingTable<T>({
  rows,
  columns,
  rowKey,
}: RankingTableProps<T>) {
  return (
    <table className="w-full text-[11px] tabular-nums">
      <thead>
        <tr
          className="text-left text-[9px] font-medium uppercase tracking-[0.14em]"
          style={{ color: MUTED }}
        >
          <th className="w-6 pb-2 pr-2">#</th>
          {columns.map((c) => (
            <th
              key={c.key}
              className={cn("pb-2", c.align === "right" ? "text-right" : "")}
              style={{ paddingLeft: c.align === "right" ? 0 : 8 }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={rowKey(row)}
            className="border-t"
            style={{ borderColor: HAIRLINE }}
          >
            <td
              className="py-2 pr-2 text-[10px] font-medium"
              style={{ color: MUTED }}
            >
              {String(i + 1).padStart(2, "0")}
            </td>
            {columns.map((c) => {
              const isRight = c.align === "right";
              const bar = c.bar?.(row);
              return (
                <td
                  key={c.key}
                  className={cn("py-2", isRight ? "text-right" : "text-left")}
                  style={{ paddingLeft: isRight ? 0 : 8, color: INK }}
                >
                  {bar ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="relative inline-block h-1.5 w-24 overflow-hidden bg-neutral-100">
                        <span
                          className="absolute inset-y-0 left-0 bg-neutral-800"
                          style={{
                            width: `${Math.min(100, (bar.value / Math.max(bar.max, 1)) * 100)}%`,
                          }}
                        />
                      </span>
                      <span>{c.render(row)}</span>
                    </div>
                  ) : (
                    c.render(row)
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Bullet attainment row ──────────────────────────────────────────

interface AttainmentRowProps {
  label: string;
  actual: number;
  target: number;
  formatter?: (n: number) => string;
}

/**
 * One-line bullet chart per category — actual vs target. Designed to stack
 * cleanly on a page so the eye reads "where is each franchise vs its goal".
 */
export function AttainmentRow({
  label,
  actual,
  target,
  formatter = (n) => n.toLocaleString("es-MX"),
}: AttainmentRowProps) {
  const pct = target > 0 ? (actual / target) * 100 : 0;
  return (
    <div
      className="briefing-no-break grid grid-cols-12 items-center gap-4 border-t py-3"
      style={{ borderColor: HAIRLINE }}
    >
      <div className="col-span-3 text-[12px] font-medium" style={{ color: INK }}>
        {label}
      </div>
      <div className="col-span-6">
        <BulletChart actual={actual} target={target} formatter={formatter} />
      </div>
      <div
        className="col-span-3 text-right text-[11px] tabular-nums"
        style={{ color: pct >= 100 ? "#0a7d2e" : pct >= 70 ? INK : ACCENT }}
      >
        {pct.toFixed(0)}% del objetivo
      </div>
    </div>
  );
}

// ── Action-title bullet list (executive summary) ───────────────────

interface ActionBulletProps {
  /** The headline insight. Should be a complete sentence. */
  title: string;
  /** Supporting numbers / explanation. */
  body: React.ReactNode;
  /** Optional metric badge ("+12% MoM"). */
  badge?: string;
  tone?: "positive" | "negative" | "neutral";
}

export function ActionBullet({ title, body, badge, tone = "neutral" }: ActionBulletProps) {
  const toneColor =
    tone === "positive" ? "#0a7d2e" : tone === "negative" ? ACCENT : INK;
  return (
    <div
      className="briefing-no-break border-l-2 pl-4"
      style={{ borderColor: toneColor }}
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className="text-[14px] font-semibold leading-snug tracking-[-0.005em]"
          style={{ color: INK }}
        >
          {title}
        </h3>
        {badge ? (
          <span
            className="shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-medium tabular-nums"
            style={{ borderColor: toneColor, color: toneColor }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: MUTED }}>
        {body}
      </p>
    </div>
  );
}

// ── Small multiples ────────────────────────────────────────────────

interface SmallMultipleProps {
  label: string;
  value: string;
  delta?: number;
  trend: number[];
}

/**
 * Grid of mini line charts — one per category. Replaces stacked-bar/multi-line
 * charts that don't print well. Tufte's "small multiples" pattern.
 */
export function SmallMultiple({ label, value, delta, trend }: SmallMultipleProps) {
  const tone = delta != null && delta < 0 ? "negative" : "positive";
  return (
    <div
      className="briefing-no-break border p-3"
      style={{ borderColor: HAIRLINE }}
    >
      <div
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{ color: MUTED }}
      >
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-[18px] font-semibold tabular-nums tracking-[-0.01em]"
          style={{ color: INK }}
        >
          {value}
        </span>
        {delta != null ? (
          <span
            className="text-[10px] font-medium tabular-nums"
            style={{ color: delta >= 0 ? "#0a7d2e" : ACCENT }}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(0)}%
          </span>
        ) : null}
      </div>
      <div className="mt-2 h-7">
        <Sparkline data={trend} tone={tone} height={28} />
      </div>
    </div>
  );
}
