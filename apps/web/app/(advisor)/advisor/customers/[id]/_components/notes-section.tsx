"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/advisor/section-card";
import { LockGlyph, PlusGlyph } from "@/components/ui/glyphs";
import {
  useCreateNote,
  useCustomerNotes,
} from "@/lib/hooks/use-customer-profile";

interface Props {
  customerId: string;
  /** When provided, the "Añadir" button delegates to the parent (usually to
   * open the full NoteSheet). Without it, falls back to the inline composer. */
  onAddNote?: () => void;
}

export function NotesSection({ customerId, onAddNote }: Props) {
  const { data, isLoading } = useCustomerNotes(customerId);
  const createNote = useCreateNote();
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);

  const useInlineComposer = !onAddNote;

  async function handleSave() {
    const body = draft.trim();
    if (!body) return;
    await createNote.mutateAsync({ customerId, body, isPrivate: true });
    setDraft("");
    setComposing(false);
  }

  return (
    <SectionCard
      title="Tus notas"
      action={
        useInlineComposer ? (
          !composing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setComposing(true)}
            >
              <PlusGlyph className="size-4" />
              Añadir
            </Button>
          ) : null
        ) : (
          <Button size="sm" variant="ghost" onClick={onAddNote}>
            <PlusGlyph className="size-4" />
            Añadir
          </Button>
        )
      }
    >
      {useInlineComposer && composing ? (
        <div className="flex flex-col gap-2 px-4 pt-2 pb-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nota privada — solo tú puedes verla"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft("");
                setComposing(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createNote.isPending || !draft.trim()}
            >
              Guardar
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
      ) : !data || data.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Aún no tienes notas. Apunta preferencias, conversaciones o detalles que te ayuden a recordar a la clienta.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((n) => (
            <li key={n.id} className="px-4 py-3">
              <p className="text-sm leading-relaxed text-foreground">
                {n.body}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {n.isPrivate ? (
                  <LockGlyph className="size-3" />
                ) : null}
                {format(new Date(n.createdAt), "d MMM yyyy · HH:mm", {
                  locale: es,
                })}
                {n.createdByName ? ` · ${n.createdByName}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
