"use client";

import type { Product } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { ProductPicker } from "@/components/dashboard/product-picker";

export function AttachmentPicker({
  open,
  attachments,
  onToggle,
  onClose,
}: {
  open: boolean;
  attachments: Product[];
  onToggle: (p: Product) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const attachmentIds = new Set(attachments.map((a) => a.id));

  return (
    <div className="absolute inset-x-0 bottom-0 top-[64px] z-10 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3">
        <div>
          <p className="font-heading text-sm text-foreground">
            Adjuntar productos
          </p>
          <p className="text-[11px] text-muted-foreground">
            {attachments.length === 0
              ? "Toca un producto para adjuntarlo al mensaje."
              : `${attachments.length} ${attachments.length === 1 ? "adjunto" : "adjuntos"}`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onClose}>
          Listo
        </Button>
      </div>
      <div className="min-h-0 flex-1 px-5 py-4">
        <ProductPicker
          onSelect={onToggle}
          selectedIds={attachmentIds}
          multi
          gridClassName="grid-cols-2 sm:grid-cols-3"
        />
      </div>
    </div>
  );
}
