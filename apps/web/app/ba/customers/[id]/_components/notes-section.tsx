"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { NoteItem, VoiceNoteRecorder } from "@/components/ba";
import {
  useCustomerNotes,
  useCreateCustomerNote,
} from "@/lib/hooks";
import { useExtractNoteFromAudio } from "@/lib/hooks/use-ai";

interface NotesSectionProps {
  customerId: string;
  actorUserId: string;
}

// Notes section — plain text flow with eyebrow timestamps.
//
// Compose strip at the top with:
//   - Autosaving textarea (debounced "Guardando…" → "Guardado")
//   - Inline voice recorder (mic icon → expands to inline strip)
//
// No "Save" button. The vision is explicit: "A los 2 segundos sin
// escribir, aparece un texto gris muy sutil: 'Guardado'".
export function NotesSection({ customerId, actorUserId }: NotesSectionProps) {
  const notes = useCustomerNotes(customerId);
  const createNote = useCreateCustomerNote();
  const extractFromAudio = useExtractNoteFromAudio();

  const [draft, setDraft] = React.useState("");
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save: 2 seconds after the BA stops typing, the note
  // gets persisted. After the success message, we clear the textarea so
  // she can start a new note. Failures stay in the input — never lose work.
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!draft.trim()) {
      setSaveState("idle");
      return;
    }
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      try {
        await createNote.mutateAsync({
          customerId,
          body: draft.trim(),
          private: false,
        });
        setSaveState("saved");
        setDraft("");
        // Fade the "Guardado" message after a moment.
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("idle");
      }
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, customerId, createNote]);

  async function handleAudio(audio: Blob, mimeType: string) {
    try {
      const result = await extractFromAudio.mutateAsync({
        audio,
        mimeType,
        customerId,
      });
      // Drop the extracted clean body into the draft so the BA can review
      // before it auto-saves (Review → Adjust → Approve pattern).
      setDraft(result.extracted.bodyClean);
    } catch {
      // silently ignore; UI shows the recorder is no longer active
    }
  }

  const list = notes.data ?? [];

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="rounded-xl border border-border/50 bg-card focus-within:border-foreground/20">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Lo que quieras recordar de ella…"
          rows={2}
          className="resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <p
            className={cn(
              "text-[11px] transition-opacity duration-300",
              saveState === "idle" && "opacity-0",
              saveState === "saving" && "text-muted-foreground opacity-100",
              saveState === "saved" && "text-muted-foreground opacity-100",
            )}
            aria-live="polite"
          >
            {saveState === "saving" ? "Guardando…" : null}
            {saveState === "saved" ? "Guardado" : null}
          </p>
          <VoiceNoteRecorder
            onRecorded={handleAudio}
            disabled={extractFromAudio.isPending}
          />
        </div>
      </div>

      {/* Existing notes — plain text flow */}
      {notes.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Aún no hay notas. Lo que escribas aquí queda guardado para ti.
        </p>
      ) : (
        <div className="divide-y divide-border/30">
          {list.slice(0, 8).map((note) => (
            <NoteItem
              key={note.id}
              body={note.body}
              createdAt={note.createdAt}
              author={note.authorUserId === actorUserId ? undefined : "Equipo"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
