import * as React from "react";
import { cn } from "@/lib/utils";
import { BulletChart } from "@/components/charts/bullet-chart";

interface HeroCardProps {
  /** Short label above the headline number. */
  eyebrow?: string;
  /** Big headline (typically the title of what we're tracking). */
  title: string;
  /** Optional context line under the title. */
  caption?: React.ReactNode;
  /** Optional trailing slot (e.g. period selector, view toggle). */
  trailing?: React.ReactNode;

  /** Goal value. When set, a BulletChart is rendered automatically. */
  target?: number;
  /** Actual achieved value. */
  actual?: number;
  /** Reference (e.g. last period) drawn as a tick on the bullet. */
  reference?: number;
  /** Number formatter for bullet labels. */
  formatter?: (value: number) => string;
  /** Custom body (overrides bullet rendering when supplied). */
  children?: React.ReactNode;

  className?: string;
}

/**
 * The "hero" of an executive dashboard — what the user should see first.
 * Wraps a BulletChart by default (the "objetivo vs avance" answer) but accepts
 * a custom body when the hero is something else (e.g. weekly appointment pace).
 */
export function HeroCard({
  eyebrow,
  title,
  caption,
  trailing,
  target,
  actual,
  reference,
  formatter,
  children,
  className,
}: HeroCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-6",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
            {title}
          </h2>
          {caption ? (
            <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </header>

      <div className="mt-5">
        {children ??
          (target != null && actual != null ? (
            <BulletChart
              target={target}
              actual={actual}
              reference={reference}
              formatter={formatter}
            />
          ) : null)}
      </div>
    </section>
  );
}
