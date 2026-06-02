"use client";

import * as React from "react";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/advisor/section-card";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_CANCELLATION_REASONS,
  APPOINTMENT_NO_SHOW_REASONS,
  type AppointmentCancellationReason,
  type AppointmentNoShowReason,
} from "@loreal/contracts";
import {
  APPOINTMENT_CANCELLATION_REASON_LABEL,
  APPOINTMENT_NO_SHOW_REASON_LABEL,
} from "@/lib/appointments/labels";
import { useAppointmentLifecycle } from "@/lib/appointments/use-appointment-lifecycle";

type ReasonKind = "cancel" | "no_show";

interface AppointmentReasonSheetProps {
  appointmentId: string;
  kind: ReasonKind | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Single sheet that captures the **reason** required by the cancel/no-show
 * state transitions. Both actions need the same UI shape (radio list +
 * optional notes), so we DRY them into one component parametrised by `kind`.
 *
 * Industry naming: the cancel sub-flow is "Cancellation reason" (BSPK),
 * the no-show is "Mark as no-show" (Tulip / Apple Genius Bar). Both follow
 * the "reason-required state change" pattern documented in Salesforce
 * Scheduler.
 */
export function AppointmentReasonSheet({
  appointmentId,
  kind,
  onOpenChange,
}: AppointmentReasonSheetProps) {
  const lifecycle = useAppointmentLifecycle(appointmentId);
  const [reason, setReason] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (kind) {
      setReason(null);
      setNotes("");
    }
  }, [kind, appointmentId]);

  const open = kind !== null;

  const config = kind === "cancel" ? CANCEL_CONFIG : NO_SHOW_CONFIG;

  async function handleSubmit() {
    if (!reason || !kind) return;
    if (kind === "cancel") {
      await lifecycle.cancel({
        reason: reason as AppointmentCancellationReason,
        notes: notes.trim() ? notes.trim() : undefined,
      });
    } else {
      await lifecycle.markNoShow({
        reason: reason as AppointmentNoShowReason,
        notes: notes.trim() ? notes.trim() : undefined,
      });
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="default">
        <SheetHeader>
          <SheetTitle>{config.title}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">
            <SectionCard title={config.reasonSectionTitle}>
              <div className="grid grid-cols-1 gap-2 px-4 pb-3 pt-1 sm:grid-cols-2">
                {config.reasons.map(({ value, label }) => {
                  const active = reason === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={lifecycle.isPending}
                      onClick={() => setReason(value)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        active
                          ? "border-foreground/40 bg-foreground/[0.03] shadow-sm"
                          : "border-border bg-card hover:border-foreground/15 hover:bg-muted/30",
                        lifecycle.isPending && "cursor-not-allowed opacity-60",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Notas (opcional)">
              <div className="px-4 pb-3 pt-1">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={config.notesPlaceholder}
                  disabled={lifecycle.isPending}
                />
              </div>
            </SectionCard>
          </div>
        </SheetBody>

        <SheetFooter>
          <SheetClose>
            <Button variant="outline">Volver</Button>
          </SheetClose>
          <Button
            variant={kind === "cancel" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={!reason || lifecycle.isPending}
          >
            {lifecycle.isPending ? "Guardando…" : config.confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Config ────────────────────────────────────────────────────────

const CANCEL_CONFIG = {
  title: "Cancelar cita",
  reasonSectionTitle: "Motivo de la cancelación",
  notesPlaceholder: "¿Algo más que registrar sobre esta cancelación?",
  confirmLabel: "Cancelar cita",
  reasons: APPOINTMENT_CANCELLATION_REASONS.map((value) => ({
    value,
    label: APPOINTMENT_CANCELLATION_REASON_LABEL[value],
  })),
};

const NO_SHOW_CONFIG = {
  title: "Marcar como no asistió",
  reasonSectionTitle: "¿Qué pasó?",
  notesPlaceholder: "Detalles que ayuden a entender por qué no llegó.",
  confirmLabel: "Marcar no-show",
  reasons: APPOINTMENT_NO_SHOW_REASONS.map((value) => ({
    value,
    label: APPOINTMENT_NO_SHOW_REASON_LABEL[value],
  })),
};
