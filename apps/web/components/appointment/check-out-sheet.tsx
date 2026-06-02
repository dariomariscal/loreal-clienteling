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
import { OutcomeRadioGroup } from "./outcome-radio-group";
import { SectionCard } from "@/components/advisor/section-card";
import { useAppointmentLifecycle } from "@/lib/appointments/use-appointment-lifecycle";
import type { AppointmentOutcomeCode } from "@loreal/contracts";

interface CheckOutSheetProps {
  appointmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Close-out flow (industry "check-out" / "close-out"). One sheet, one click.
 *
 * What's deliberately omitted (KISS):
 *  - No multi-step wizard. Outcome + notes is the entire decision set the BA
 *    needs at the chair.
 *  - No editable auto-follow-ups list. The 3 standard tasks (thank-you,
 *    NPS, 14d follow-up) are seeded server-side; we surface them as a
 *    read-only preview so the BA knows what will happen, but they can't
 *    toggle them off mid-flow. Adjust in the tasks page if needed.
 *
 * After success this component closes itself; the parent invalidates queries.
 */
export function CheckOutSheet({
  appointmentId,
  open,
  onOpenChange,
}: CheckOutSheetProps) {
  const lifecycle = useAppointmentLifecycle(appointmentId);
  const [outcome, setOutcome] = React.useState<AppointmentOutcomeCode | null>(
    null,
  );
  const [notes, setNotes] = React.useState("");
  const [satisfactionScore, setSatisfactionScore] = React.useState<number>(8);
  const [productsUsedText, setProductsUsedText] = React.useState("");

  // Reset local state every time the sheet opens, so the previous appointment's
  // outcome doesn't bleed into the next close-out.
  React.useEffect(() => {
    if (open) {
      setOutcome(null);
      setNotes("");
      setSatisfactionScore(8);
      setProductsUsedText("");
    }
  }, [open, appointmentId]);

  async function handleSubmit() {
    if (!outcome) return;
    const productsUsed = productsUsedText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const serviceOutcome =
      productsUsed.length > 0 || notes.trim()
        ? {
            satisfactionScore,
            ...(productsUsed.length > 0 ? { productsUsed } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          }
        : { satisfactionScore };
    await lifecycle.checkOut({
      outcomeCode: outcome,
      serviceOutcome,
      notes: notes.trim() ? notes.trim() : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="default">
        <SheetHeader>
          <SheetTitle>Cerrar cita</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">
            <SectionCard title="Resultado">
              <div className="px-4 pb-3 pt-1">
                <OutcomeRadioGroup
                  value={outcome}
                  onChange={setOutcome}
                  disabled={lifecycle.isPending}
                />
              </div>
            </SectionCard>

            <SectionCard title="Productos usados (separados por coma)">
              <div className="px-4 pb-3 pt-1">
                <Textarea
                  value={productsUsedText}
                  onChange={(e) => setProductsUsedText(e.target.value)}
                  rows={2}
                  placeholder="p. ej. Génifique, Teint Idole 220"
                  disabled={lifecycle.isPending}
                />
              </div>
            </SectionCard>

            <SectionCard title={`Satisfacción · ${satisfactionScore}/10`}>
              <div className="px-4 pb-3 pt-1">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={satisfactionScore}
                  onChange={(e) => setSatisfactionScore(Number(e.target.value))}
                  disabled={lifecycle.isPending}
                  className="w-full accent-foreground"
                />
                <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Baja</span>
                  <span>Alta</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Notas finales">
              <div className="px-4 pb-3 pt-1">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="¿Qué se mostró, qué le gustó, qué quedó pendiente?"
                  disabled={lifecycle.isPending}
                />
              </div>
            </SectionCard>

            <SectionCard title="Se crearán automáticamente">
              <ul className="space-y-2 px-4 pb-3 pt-1 text-sm text-muted-foreground">
                <li className="flex items-baseline gap-2">
                  <Bullet /> Mensaje de agradecimiento hoy
                </li>
                <li className="flex items-baseline gap-2">
                  <Bullet /> Encuesta NPS en 2 días
                </li>
                <li className="flex items-baseline gap-2">
                  <Bullet /> Seguimiento de relación en 14 días
                </li>
              </ul>
            </SectionCard>
          </div>
        </SheetBody>

        <SheetFooter>
          <SheetClose>
            <Button variant="outline">Cancelar</Button>
          </SheetClose>
          <Button
            onClick={handleSubmit}
            disabled={!outcome || lifecycle.isPending}
          >
            {lifecycle.isPending ? "Guardando…" : "Cerrar cita"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Bullet() {
  return (
    <span
      aria-hidden
      className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-foreground/40"
    />
  );
}
