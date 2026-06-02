"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/advisor/section-card";
import { useAppointmentLifecycle } from "@/lib/appointments/use-appointment-lifecycle";

interface CustomerConfirmationCardProps {
  appointmentId: string;
  /** Already confirmed (timestamp present) — hides the "Confirmó" CTA. */
  confirmedAt: string | null;
  /** Cancelled / completed / no-show — entire card is hidden. */
  disabled?: boolean;
  onCancel?: () => void;
}

/**
 * Logs the customer's external response when it didn't come through an
 * integrated channel (Twilio webhook, app push). In luxury retail this is
 * common: the customer calls the boutique, replies on the BA's personal
 * WhatsApp, leaves a message at the counter — the BA needs to reflect that
 * in the system.
 *
 * Industry naming: "Customer confirmation" / "Manual confirmation entry"
 * (Endear, BSPK). When Twilio is integrated, the webhook hits the same
 * `/appointments/:id/confirm` endpoint these buttons call — this UI stays
 * as a fallback for off-channel responses.
 */
export function CustomerConfirmationCard({
  appointmentId,
  confirmedAt,
  disabled = false,
  onCancel,
}: CustomerConfirmationCardProps) {
  const lifecycle = useAppointmentLifecycle(appointmentId);

  if (disabled) return null;

  return (
    <SectionCard
      title="Respuesta de la clienta"
      action={
        confirmedAt ? (
          <span className="text-xs text-muted-foreground">
            Confirmada {formatRelative(confirmedAt)}
          </span>
        ) : null
      }
    >
      <div className="px-4 pb-2 pt-1">
        <p className="text-xs text-muted-foreground">
          Normalmente llega por SMS o WhatsApp. Regístrala aquí cuando la
          clienta responda por otro canal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 px-4 pb-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={confirmedAt ? "outline" : "default"}
          size="sm"
          disabled={lifecycle.isPending || !!confirmedAt}
          onClick={() => lifecycle.confirm()}
        >
          {confirmedAt ? "Ya confirmó" : "Confirmó la cita"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={lifecycle.isPending}
          onClick={() => onCancel?.()}
        >
          Pidió cancelar
        </Button>
      </div>
    </SectionCard>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}
