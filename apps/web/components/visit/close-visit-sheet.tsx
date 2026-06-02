"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  VisitReason,
  VisitOutcome,
  VisitSentiment,
} from "@loreal/contracts";
import { useCloseCustomerVisit } from "@/lib/hooks/use-customer-visits";
import type { CustomerVisitListItem } from "@/lib/hooks/use-customer-visits";
import {
  VISIT_REASON_ORDER,
  VISIT_OUTCOME_ORDER,
  VISIT_SENTIMENT_ORDER,
  visitReasonLabel,
  visitOutcomeLabel,
  visitSentimentMeta,
  formatVisitDuration,
  FOLLOWUP_PRESETS,
  type FollowupPreset,
} from "@/components/advisor/visit-vocabulary";

// ── Sheet ────────────────────────────────────────────────────────────

interface CloseVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: CustomerVisitListItem | null;
  /**
   * Override the customer name (e.g. when the parent already has the customer
   * loaded with a fresher source than the visit's joined relation).
   */
  customerName?: string;
  /** Called after a successful close so the parent can dismiss its own UI. */
  onClosed?: () => void;
}

/**
 * Close-out bottom sheet — the BA's last interaction with the visit.
 *
 * Adapted from the patterns common to Endear, Mercaux and Tulip: one screen,
 * one scroll. Reason chips → outcome segmented control → emoji sentiment row
 * → optional follow-up preset → optional voice/typed note. We never open a
 * date picker for the follow-up; the three presets cover the cadence beauty
 * advisors actually use (2w / 1m / 3m).
 *
 * If the visit started from an appointment with a `bookedReason`, that chip
 * arrives pre-selected — the BA confirms with one tap (the Salesforce CG
 * "auto-suggested reason" pattern, lightened).
 */
export function CloseVisitSheet({
  open,
  onOpenChange,
  visit,
  customerName,
  onClosed,
}: CloseVisitSheetProps) {
  const closeVisit = useCloseCustomerVisit();

  // Local form state. We don't use react-hook-form because the surface is
  // four chip groups + a textarea — wiring RHF would be heavier than what we
  // gain from validation here, and the API rejects anything malformed.
  const [reason, setReason] = React.useState<VisitReason | null>(null);
  const [outcome, setOutcome] = React.useState<VisitOutcome | null>(null);
  const [sentiment, setSentiment] = React.useState<VisitSentiment | null>(null);
  const [followupPresetId, setFollowupPresetId] = React.useState<string | null>(
    null,
  );
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Resync defaults when the sheet opens. We seed `reason` with the
  // appointment's bookedReason so the close-out feels prefilled. The BA
  // confirms or picks a different chip.
  React.useEffect(() => {
    if (!open || !visit) return;
    setReason(
      visit.bookedReason
        ? (visit.bookedReason as VisitReason)
        : null,
    );
    setOutcome(null);
    setSentiment(null);
    setFollowupPresetId(null);
    setNotes("");
    setError(null);
  }, [open, visit]);

  const name = customerName ?? formatCustomerName(visit);
  const elapsed = visit ? formatVisitDuration(visit.startedAt) : "";

  async function handleSubmit() {
    if (!visit) return;
    if (!reason) {
      setError("Elige el motivo de la visita.");
      return;
    }
    if (!outcome) {
      setError("Elige cómo terminó la visita.");
      return;
    }
    setError(null);

    const followUpDate = followupPresetId
      ? FOLLOWUP_PRESETS.find((p) => p.id === followupPresetId)?.resolve(new Date())
      : undefined;

    await closeVisit.mutateAsync({
      id: visit.id,
      visitReason: reason,
      outcome,
      sentiment: sentiment ?? undefined,
      notes: notes.trim() || undefined,
      followUpDate,
    });

    onClosed?.();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Cerrar visita</SheetTitle>
          <SheetDescription>
            {name ? (
              <>
                {name} · {elapsed}
                {visit?.bookedReason ? " · cita agendada" : " · sin cita previa"}
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-7">
            <ReasonSection value={reason} onChange={setReason} />
            <OutcomeSection value={outcome} onChange={setOutcome} />
            <SentimentSection value={sentiment} onChange={setSentiment} />
            <FollowupSection
              value={followupPresetId}
              onChange={setFollowupPresetId}
            />
            <NotesSection value={notes} onChange={setNotes} />

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
        </SheetBody>

        <SheetFooter>
          <SheetClose>
            <Button variant="ghost" className="h-11">
              Cancelar
            </Button>
          </SheetClose>
          <Button
            type="button"
            className="ml-auto h-11"
            disabled={closeVisit.isPending}
            onClick={handleSubmit}
          >
            {closeVisit.isPending ? "Cerrando…" : "Cerrar visita"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Sections (one per question — keeps each focused & testable) ──────

function ReasonSection({
  value,
  onChange,
}: {
  value: VisitReason | null;
  onChange: (v: VisitReason) => void;
}) {
  return (
    <Question
      title="¿De qué se trató?"
      hint="Pre-seleccionamos el motivo de la cita si venía agendada."
    >
      <div className="flex flex-wrap gap-2">
        {VISIT_REASON_ORDER.map((r) => (
          <Chip
            key={r}
            label={visitReasonLabel(r)}
            selected={value === r}
            onClick={() => onChange(r)}
          />
        ))}
      </div>
    </Question>
  );
}

function OutcomeSection({
  value,
  onChange,
}: {
  value: VisitOutcome | null;
  onChange: (v: VisitOutcome) => void;
}) {
  return (
    <Question title="¿Cómo terminó?">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {VISIT_OUTCOME_ORDER.map((o) => (
          <SegmentButton
            key={o}
            label={visitOutcomeLabel(o)}
            selected={value === o}
            onClick={() => onChange(o)}
          />
        ))}
      </div>
    </Question>
  );
}

function SentimentSection({
  value,
  onChange,
}: {
  value: VisitSentiment | null;
  onChange: (v: VisitSentiment) => void;
}) {
  return (
    <Question
      title="¿Cómo se fue?"
      hint="Opcional. Te ayudará a recordar el tono de la conversación."
    >
      <div className="flex items-center justify-center gap-3">
        {VISIT_SENTIMENT_ORDER.map((s) => {
          const meta = visitSentimentMeta(s);
          if (!meta) return null;
          const selected = value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={selected}
              aria-label={meta.label}
              className={cn(
                "flex size-14 items-center justify-center rounded-full border text-2xl transition-all",
                selected
                  ? "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)] scale-110"
                  : "border-border bg-background opacity-60 hover:opacity-100",
              )}
            >
              <span aria-hidden>{meta.emoji}</span>
            </button>
          );
        })}
      </div>
    </Question>
  );
}

function FollowupSection({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Question
      title="¿Seguimiento?"
      hint="Opcional. Te avisaremos para retomar la conversación."
    >
      <div className="flex flex-wrap gap-2">
        {FOLLOWUP_PRESETS.map((preset) => (
          <FollowupChip
            key={preset.id}
            preset={preset}
            selected={value === preset.id}
            onClick={() =>
              onChange(value === preset.id ? null : preset.id)
            }
          />
        ))}
      </div>
    </Question>
  );
}

function NotesSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Question
      title="Notas"
      hint="Apunta detalles que te ayuden a recordar la visita."
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="¿Qué probó? ¿Qué le gustó? ¿Qué se llevó?"
        rows={3}
      />
    </Question>
  );
}

// ── Reusable primitives — strictly visual ────────────────────────────

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-foreground">
          {title}
        </h3>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-11 items-center rounded-full border px-4 text-sm transition-colors",
        selected
          ? "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)] text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function SegmentButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex h-12 items-center justify-center rounded-xl border px-3 text-center text-sm font-medium transition-colors",
        selected
          ? "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)] text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function FollowupChip({
  preset,
  selected,
  onClick,
}: {
  preset: FollowupPreset;
  selected: boolean;
  onClick: () => void;
}) {
  const date = preset.resolve(new Date());
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-2.5 text-left transition-colors",
        selected
          ? "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)]"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {preset.label}
      </span>
      <span className="text-xs text-muted-foreground first-letter:uppercase">
        {format(date, "EEE d 'de' MMM", { locale: es })}
      </span>
    </button>
  );
}

function formatCustomerName(visit: CustomerVisitListItem | null): string {
  if (!visit?.customer) return "";
  return `${visit.customer.firstName} ${visit.customer.lastName}`.trim();
}
