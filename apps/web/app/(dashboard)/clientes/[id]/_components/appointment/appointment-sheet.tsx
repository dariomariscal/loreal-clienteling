"use client";

import * as React from "react";
import {
  useServiceTypes,
  useAvailabilityDays,
  useAvailabilitySlots,
  useCreateAppointment,
  type CustomerListItem,
} from "@/lib/hooks";
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
import { cn } from "@/lib/utils";
import { DAY_RANGE, DEFAULT_DURATION } from "./constants";
import { addDays, buildDayStrip, toISODate } from "./use-day-strip";
import { ServiceCard } from "./service-card";
import { DayChip } from "./day-chip";
import { SlotChip } from "./slot-chip";
import { BookingPreview } from "./booking-preview";
import { CustomerPicker, PickedCustomerCard } from "./customer-picker";

// Appointment composer — Calendly-style 3-step wizard.
// Step 1: service type · Step 2: day strip · Step 3: time slots.
// Live preview at the bottom in the service's color, then confirm.

interface AppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, skips the client picker step and pre-fills the customer. */
  customerId?: string;
  customerName?: string;
  customerLifecycleStage?: string | null;
  staffUserId: string;
  /**
   * Optional ISO string from a clicked empty slot on the agenda — we use it
   * to pre-select the day chip, but never the time (BAs expect to confirm).
   */
  defaultStartsAt?: string | null;
}

export function AppointmentSheet({
  open,
  onOpenChange,
  customerId: providedCustomerId,
  customerName: providedCustomerName,
  customerLifecycleStage: providedCustomerLifecycleStage,
  staffUserId,
  defaultStartsAt,
}: AppointmentSheetProps) {
  const [pickedCustomer, setPickedCustomer] =
    React.useState<CustomerListItem | null>(null);
  const customerId = providedCustomerId ?? pickedCustomer?.id ?? null;
  const customerName =
    providedCustomerName ??
    (pickedCustomer
      ? `${pickedCustomer.firstName} ${pickedCustomer.lastName}`
      : "");
  const customerLifecycleStage =
    providedCustomerLifecycleStage ?? pickedCustomer?.lifecycleStage ?? null;
  const needsCustomerPick = !providedCustomerId;

  const [serviceTypeId, setServiceTypeId] = React.useState<string | null>(null);
  const [date, setDate] = React.useState<string | null>(null);
  const [slotStartsAt, setSlotStartsAt] = React.useState<string | null>(null);
  const [isVirtual, setIsVirtual] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const { data: serviceTypes = [], isLoading: typesLoading } =
    useServiceTypes();
  const createAppointment = useCreateAppointment();

  // Reset the form whenever the sheet opens. We intentionally exclude the
  // picked customer's segment from the dep array — when the BA picks a
  // client, that would re-fire this effect and clear the selection. The
  // VIP default is recomputed in a separate effect below.
  React.useEffect(() => {
    if (!open) return;
    setPickedCustomer(null);
    if (defaultStartsAt) {
      setDate(toISODate(new Date(defaultStartsAt)));
    } else {
      setDate(null);
    }
    setSlotStartsAt(null);
    setIsVirtual(false);
    setNotes("");
    createAppointment.reset();
    setServiceTypeId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultStartsAt]);

  // Default to VIP cabin once we know the customer is VIP and the service
  // types have loaded. Runs separately so picking a client doesn't reset
  // the rest of the form.
  React.useEffect(() => {
    if (!open || serviceTypes.length === 0) return;
    if (serviceTypeId !== null) return;
    if (customerLifecycleStage !== "vip") return;
    const vipFirst = serviceTypes.find((t) => t.code === "vip_cabin");
    if (vipFirst) setServiceTypeId(vipFirst.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerLifecycleStage, serviceTypes.length]);

  const selectedType = React.useMemo(
    () => serviceTypes.find((t) => t.id === serviceTypeId) ?? null,
    [serviceTypes, serviceTypeId],
  );

  const durationMinutes =
    selectedType?.durationMinutes && selectedType.durationMinutes > 0
      ? selectedType.durationMinutes
      : DEFAULT_DURATION;

  const dayRange = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = toISODate(today);
    const to = toISODate(addDays(today, DAY_RANGE - 1));
    return { from, to };
  }, []);

  const { data: availabilityDays = [], isLoading: daysLoading } =
    useAvailabilityDays({
      staffUserId,
      from: dayRange.from,
      to: dayRange.to,
      durationMinutes,
      enabled: !!selectedType && open,
    });

  const { data: availabilitySlots = [], isLoading: slotsLoading } =
    useAvailabilitySlots({
      staffUserId,
      date: date ?? "",
      durationMinutes,
      enabled: !!date && !!selectedType && open,
    });

  // Drop downstream selections when service/day changes — slot depends on
  // both, so a stale pick would be misleading.
  React.useEffect(() => {
    setSlotStartsAt(null);
  }, [date]);

  React.useEffect(() => {
    setSlotStartsAt(null);
  }, [serviceTypeId]);

  const days = React.useMemo(
    () => buildDayStrip(dayRange.from, DAY_RANGE, availabilityDays),
    [dayRange.from, availabilityDays],
  );

  const canConfirm =
    !!customerId &&
    !!selectedType &&
    !!slotStartsAt &&
    !createAppointment.isPending;

  function handleConfirm() {
    if (!canConfirm || !customerId || !selectedType || !slotStartsAt) return;
    createAppointment.mutate(
      {
        customerId,
        serviceTypeId: selectedType.id,
        startTime: new Date(slotStartsAt),
        durationMinutes,
        isVirtual,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  const accent = selectedType?.color ?? "var(--accent)";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Agendar cita</SheetTitle>
          <SheetDescription>
            {customerName ? (
              <>
                Para <span className="text-foreground">{customerName}</span>
                {customerLifecycleStage === "vip" && (
                  <Badge variant="success" size="sm" className="ml-2">
                    VIP
                  </Badge>
                )}
              </>
            ) : (
              <>Elige a la clienta para empezar.</>
            )}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6!">
          {needsCustomerPick && (
            <Step number="·" title="Clienta">
              {pickedCustomer ? (
                <PickedCustomerCard
                  customer={pickedCustomer}
                  onChange={() => setPickedCustomer(null)}
                />
              ) : (
                <CustomerPicker
                  staffUserId={staffUserId}
                  onPick={setPickedCustomer}
                />
              )}
            </Step>
          )}

          <Step number={1} title="Tipo de servicio">
            {typesLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-muted/40"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {serviceTypes
                  .filter((t) => t.isActive)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((t) => (
                    <ServiceCard
                      key={t.id}
                      serviceType={t}
                      selected={t.id === serviceTypeId}
                      recommended={
                        customerLifecycleStage === "vip" && t.code === "vip_cabin"
                      }
                      onSelect={() => setServiceTypeId(t.id)}
                    />
                  ))}
              </div>
            )}
          </Step>

          {selectedType && (
            <Step number={2} title="Día">
              {daysLoading ? (
                <div className="flex gap-1.5 overflow-x-auto">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 w-12 shrink-0 animate-pulse rounded-xl bg-muted/40"
                    />
                  ))}
                </div>
              ) : (
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {days.map((d) => (
                    <DayChip
                      key={d.iso}
                      day={d}
                      selected={d.iso === date}
                      onSelect={() => d.available && setDate(d.iso)}
                    />
                  ))}
                </div>
              )}
            </Step>
          )}

          {selectedType && date && (
            <Step number={3} title="Hora">
              {slotsLoading ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-muted/40"
                    />
                  ))}
                </div>
              ) : availabilitySlots.length === 0 ? (
                <p className="rounded-xl border border-border/40 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                  No hay horarios libres este día. Intenta otro.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availabilitySlots.map((slot) => (
                    <SlotChip
                      key={slot.startsAt}
                      startsAt={slot.startsAt}
                      selected={slot.startsAt === slotStartsAt}
                      onSelect={() => setSlotStartsAt(slot.startsAt)}
                    />
                  ))}
                </div>
              )}
            </Step>
          )}

          {selectedType && slotStartsAt && (
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Vista previa
              </p>
              <BookingPreview
                serviceType={selectedType}
                startsAt={slotStartsAt}
                durationMinutes={durationMinutes}
                customerName={customerName}
                accent={accent}
              />

              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm transition-colors",
                  isVirtual ? "bg-muted/40" : "bg-background hover:bg-muted/20",
                )}
              >
                <span className="flex items-center gap-2">
                  <VideoIcon className="size-4 text-muted-foreground" />
                  Cita virtual
                </span>
                <input
                  type="checkbox"
                  checked={isVirtual}
                  onChange={(e) => setIsVirtual(e.target.checked)}
                  className="size-4 accent-foreground"
                />
              </label>

              <div className="space-y-1.5">
                <label
                  htmlFor="appt-notes"
                  className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Comentarios (opcional)
                </label>
                <textarea
                  id="appt-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Preferencias, motivo, recordatorios…"
                  disabled={createAppointment.isPending}
                  className={cn(
                    "w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors",
                    "placeholder:text-muted-foreground/50",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                  )}
                />
              </div>
            </div>
          )}

          {createAppointment.isError && (
            <Badge variant="destructive" className="w-full justify-center">
              No se pudo agendar la cita. Intenta de nuevo.
            </Badge>
          )}
        </SheetBody>

        <SheetFooter>
          <SheetClose>
            <Button variant="ghost" disabled={createAppointment.isPending}>
              Cancelar
            </Button>
          </SheetClose>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {createAppointment.isPending ? "Agendando…" : "Confirmar cita"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number | string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
          {number}
        </span>
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function VideoIcon({ className }: { className?: string }) {
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
      <rect x="2" y="4" width="9" height="8" rx="1.5" />
      <path d="m11 7 3-2v6l-3-2z" />
    </svg>
  );
}
