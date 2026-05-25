"use client";

import * as React from "react";
import { useCustomerNotes, useDeleteNote } from "@/lib/hooks";
import type { Note } from "@loreal/contracts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NotesIllustration } from "@/components/ui/illustrations";
import { cn } from "@/lib/utils";

interface NotesSectionProps {
  customerId: string;
  onNewNote?: () => void;
}

export function NotesSection({ customerId, onNewNote }: NotesSectionProps) {
  const { data: notes = [], isLoading } = useCustomerNotes(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-border/40 bg-muted/30"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        illustration={<NotesIllustration />}
        title="Sin notas aún"
        description="Captura observaciones rápidas sobre la clienta — preferencias, alergias, eventos."
        action={
          onNewNote ? (
            <Button onClick={onNewNote}>
              <PlusIcon className="size-3.5" />
              Nueva nota
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {notes.length} {notes.length === 1 ? "nota" : "notas"}
        </p>
        {onNewNote && (
          <Button size="sm" onClick={onNewNote}>
            <PlusIcon className="size-3.5" />
            Nueva
          </Button>
        )}
      </div>

      <ul className="space-y-2.5">
        {notes
          .slice()
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              customerId={customerId}
            />
          ))}
      </ul>
    </div>
  );
}

function NoteCard({
  note,
  customerId,
}: {
  note: Note;
  customerId: string;
}) {
  const deleteNote = useDeleteNote();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-reset confirm state after 3s.
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteNote.mutate({ id: note.id, customerId });
  }

  // Pull out leading hashtags so we can render them as chips and show the
  // editorial body below — the tags were stored prepended by the sheet.
  const { tags, prose } = parseNote(note.body);

  return (
    <li
      className={cn(
        "group relative rounded-2xl border border-border/60 bg-card p-4 transition-shadow duration-200",
        "hover:shadow-sm",
        note.isPrivate && "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2 overflow-hidden">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" size="sm">
                  #{t}
                </Badge>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap font-heading text-[14px] leading-[1.65] text-foreground">
            {prose}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
            <time>{formatRelative(note.createdAt)}</time>
            {note.isPrivate && (
              <span className="inline-flex items-center gap-1">
                <LockIcon className="size-3" /> Privada
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleteNote.isPending}
          aria-label="Eliminar nota"
          className={cn(
            "shrink-0 rounded-lg p-1.5 transition-all duration-200",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            confirmDelete
              ? "bg-destructive/10 text-destructive opacity-100"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {confirmDelete ? (
            <span className="px-1 text-[11px] font-medium">Confirmar</span>
          ) : (
            <TrashIcon className="size-3.5" />
          )}
        </button>
      </div>
    </li>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function parseNote(raw: string): { tags: string[]; prose: string } {
  const match = raw.match(/^((?:#\S+\s+)+)(.*)$/s);
  if (!match) return { tags: [], prose: raw };
  const tagPart = match[1].trim();
  const tags = tagPart
    .split(/\s+/)
    .map((t) => t.replace(/^#/, ""))
    .filter(Boolean);
  return { tags, prose: match[2].trim() };
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `Hace ${diffDay} d`;
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9.5h5L11 4" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 1 1 5 0v2" />
    </svg>
  );
}
