"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { GlyphComponent } from "./constants";

export function Heading({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="font-heading text-xl tracking-tight text-foreground">
        {title}
      </h3>
      {hint && (
        <p className="text-[13px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SubSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: "success" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.12em]",
          accent === "success" && "text-success",
          accent === "destructive" && "text-destructive",
          !accent && "text-muted-foreground",
        )}
      >
        {title}
      </p>
      {children}
    </section>
  );
}

export function SelectableCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition-all duration-200",
          selected
            ? "border-foreground shadow-sm"
            : "border-border/60 hover:border-foreground/30",
        )}
      >
        {children}
      </button>
    </li>
  );
}

export function ChipToggle({
  active,
  Glyph,
  label,
  onClick,
}: {
  active: boolean;
  Glyph?: GlyphComponent;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
          active
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        )}
      >
        {Glyph && <Glyph className="size-3.5" />}
        {label}
      </button>
    </li>
  );
}

export function IngredientPicker({
  values,
  suggestions,
  accent,
  onToggleSuggestion,
  onChange,
}: {
  values: string[];
  suggestions: string[];
  accent: "success" | "destructive";
  onToggleSuggestion: (v: string) => void;
  onChange: (arr: string[]) => void;
}) {
  const [input, setInput] = React.useState("");

  function commit() {
    const v = input.trim().toLowerCase();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  const accentClasses =
    accent === "success"
      ? "border-success/40 bg-success/10 text-success"
      : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => remove(v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  accentClasses,
                  "hover:opacity-80",
                )}
              >
                {v}
                <XIcon className="size-2.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder="Escribir ingrediente y presionar Enter…"
        className={cn(
          "h-9 w-full rounded-xl border border-border bg-transparent px-3 text-sm outline-none transition-colors",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        )}
      />

      <ul className="flex flex-wrap gap-1">
        {suggestions
          .filter((s) => !values.includes(s))
          .map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onToggleSuggestion(s)}
                className="rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                + {s}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
