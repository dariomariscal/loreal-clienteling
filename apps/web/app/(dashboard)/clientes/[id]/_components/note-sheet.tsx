"use client";

import * as React from "react";
import { useCreateCustomerNote } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  LockGlyph,
  TagPreferenceGlyph,
  TagAllergyGlyph,
  TagEventGlyph,
  TagObjectionGlyph,
  TagFollowupGlyph,
} from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

type GlyphComponent = React.ComponentType<{ className?: string }>;

// ── Quick tags ─────────────────────────────────────────────────────
// One-tap tags prepended to the body. We keep this list short so the
// barra inferior stays calm; the BA can still type anything else.

const QUICK_TAGS: ReadonlyArray<{
  key: string;
  label: string;
  Glyph: GlyphComponent;
}> = [
  { key: "preference", label: "Preferencia", Glyph: TagPreferenceGlyph },
  { key: "allergy", label: "Alergia", Glyph: TagAllergyGlyph },
  { key: "event", label: "Evento", Glyph: TagEventGlyph },
  { key: "objection", label: "Objeción", Glyph: TagObjectionGlyph },
  { key: "followup", label: "Seguimiento", Glyph: TagFollowupGlyph },
];

type TagKey = string;

interface NoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

/**
 * Quick capture in the spirit of Apple Notes: editorial paper-like surface,
 * one-tap tags, private toggle, no "submit" friction. The save fires when
 * the user explicitly closes via the Guardar button or auto-saves on close
 * if there is text.
 */
export function NoteSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: NoteSheetProps) {
  const [body, setBody] = React.useState("");
  const [tags, setTags] = React.useState<TagKey[]>([]);
  const [isPrivate, setIsPrivate] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const createNote = useCreateCustomerNote();

  // Reset on open and focus the editor so the BA can start typing right away.
  React.useEffect(() => {
    if (open) {
      setBody("");
      setTags([]);
      setIsPrivate(false);
      // Defer focus until the sheet animation has placed the textarea.
      const t = setTimeout(() => textareaRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  function toggleTag(tag: TagKey) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function composedBody(): string {
    if (tags.length === 0) return body.trim();
    const prefix = tags
      .map((t) => `#${QUICK_TAGS.find((q) => q.key === t)!.label.toLowerCase()}`)
      .join(" ");
    return `${prefix} ${body.trim()}`.trim();
  }

  function handleSave() {
    const content = composedBody();
    if (!content) {
      onOpenChange(false);
      return;
    }
    createNote.mutate(
      {
        customerId,
        body: content.slice(0, 500),
        private: isPrivate,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  const charsLeft = 500 - composedBody().length;
  const isNearLimit = charsLeft < 50;
  const canSave = composedBody().length > 0 && !createNote.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="default">
        <SheetHeader>
          <SheetTitle>Nota rápida</SheetTitle>
          <SheetDescription>
            Sobre <span className="text-foreground">{customerName}</span>
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4!">
          {/* Editor — paper-like surface */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="¿Qué observaste hoy?"
              rows={10}
              maxLength={500}
              disabled={createNote.isPending}
              className={cn(
                "w-full resize-none rounded-2xl border border-border/60 bg-muted/20 px-5 py-4",
                "font-heading text-[15px] leading-[1.7] tracking-[0.005em] text-foreground",
                "placeholder:font-sans placeholder:text-[14px] placeholder:italic placeholder:text-muted-foreground/60",
                "outline-none transition-all duration-200",
                "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:opacity-50",
              )}
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, color-mix(in oklab, currentColor 8%, transparent) 27px, color-mix(in oklab, currentColor 8%, transparent) 28px)",
                backgroundAttachment: "local",
              }}
            />
            <div
              className={cn(
                "pointer-events-none absolute bottom-3 right-4 text-[11px] tabular-nums transition-colors",
                isNearLimit ? "text-destructive" : "text-muted-foreground/50",
              )}
            >
              {charsLeft}
            </div>
          </div>

          {/* Quick tag chips */}
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
              Etiquetar
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((t) => {
                const active = tags.includes(t.key);
                const Glyph = t.Glyph;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleTag(t.key)}
                    disabled={createNote.isPending}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                      active
                        ? "border-accent bg-accent/10 text-accent-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    <Glyph className="size-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy toggle */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors",
              isPrivate ? "bg-muted/40" : "bg-background hover:bg-muted/20",
            )}
          >
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={createNote.isPending}
              className="mt-0.5 size-4 accent-foreground"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <LockGlyph className="size-3.5" />
                Nota privada
              </div>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                Solo tú podrás verla. Otros BAs y gerentes no la verán en el perfil.
              </p>
            </div>
          </label>

          {createNote.isError && (
            <Badge variant="destructive" className="w-full justify-center">
              No se pudo guardar la nota. Intenta de nuevo.
            </Badge>
          )}
        </SheetBody>

        <SheetFooter>
          <SheetClose>
            <Button variant="ghost" disabled={createNote.isPending}>
              Descartar
            </Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={!canSave}>
            {createNote.isPending ? "Guardando…" : "Guardar nota"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

