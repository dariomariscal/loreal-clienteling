"use client";

import type { MessageTemplate } from "@/lib/hooks";

export function TemplatePicker({
  templates,
  onPick,
}: {
  templates: MessageTemplate[];
  onPick: (t: MessageTemplate) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-border/30 bg-background px-5 py-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        Plantillas
      </p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {templates.slice(0, 6).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-foreground transition-colors hover:border-foreground/40 hover:bg-muted"
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
