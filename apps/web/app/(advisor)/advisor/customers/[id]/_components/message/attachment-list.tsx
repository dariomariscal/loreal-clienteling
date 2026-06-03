"use client";

import type { Product } from "@/lib/hooks";
import { XIcon } from "./icons";

export function AttachmentList({
  attachments,
  disabled,
  onRemove,
}: {
  attachments: Product[];
  disabled: boolean;
  onRemove: (p: Product) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {attachments.map((p) => (
        <li
          key={p.id}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card py-1 pl-1 pr-2"
        >
          <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted/40">
            {p.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.images[0]}
                alt=""
                className="absolute inset-0 size-full object-cover"
                loading="lazy"
              />
            ) : null}
          </span>
          <span className="max-w-[180px] truncate text-[12px] text-foreground">
            {p.title}
          </span>
          <button
            type="button"
            onClick={() => onRemove(p)}
            disabled={disabled}
            aria-label={`Quitar ${p.title}`}
            className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
          >
            <XIcon className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}
