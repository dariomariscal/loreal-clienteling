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
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useServiceTypes,
  useAvailabilityDays,
  useAvailabilitySlots,
  useCreateAppointment,
  useCustomer,
  type CustomerListItem,
} from "@/lib/hooks";
import { ServiceGrid } from "./appointment/service-grid";
import { DayStrip } from "./appointment/day-strip";
import { SlotGrid } from "./appointment/slot-grid";
import { BookingSummary } from "./appointment/booking-summary";
import { CustomerSearchField } from "./appointment/customer-search-field";

const DAY_RANGE = 14;
const DEFAULT_DURATION = 60;

interface NewAppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUserId: string;
  /** When provided, the customer picker is hidden and the customer is fixed. */
  customerId?: string;
  /** Optional ISO instant from a clicked slot — preselects the day, never the time. */
  defaultStartsAt?: string | null;
}

// NewAppointmentSheet — single-page editorial composer.
//
// Sin wizard numerado. Cada sección es un eyebrow uppercase + contenido,
// con el flujo natural: clienta (si no viene) → servicio → día → hora
// → vista previa → modalidad → nota. Footer sticky con Cancelar +
// Agendar cita y una línea muted que informa de la notificación
// automática a la clienta — política global, sin toggle.
//
// La única affordance IA del sheet es un sparkle dot en la card del
// servicio recomendado cuando la clienta es VIP. Restraint total.
export function NewAppointmentSheet({
  open,
  onOpenChange,
  staffUserId,
  customerId: providedCustomerId,
  defaultStartsAt,
}: NewAppointmentSheetProps) {
  // ── Customer state ──
  // When customerId is provided externally we fetch it to display the
  // picked card; otherwise the BA picks via search.
  const providedCustomer = useCustomer(providedCustomerId ?? "");
  const [pickedCustomer, setPickedCustomer] =
    React.useState<CustomerListItem | null>(null);

  // The two sources have different shapes (full row vs list projection) but
  // downstream only reads id/firstName/lastName/lifecycleStage, so we expose
  // them through a narrow shared shape.
  const customer: Pick<
    CustomerListItem,
    "id" | "firstName" | "lastName" | "lifecycleStage"
  > | null = providedCustomerId
    ? providedCustomer.data ?? null
    : pickedCustomer;
  const customerId = customer?.id ?? null;
  const customerName = customer
    ? `${customer.firstName} ${customer.lastName}`.trim()
    : "";
  const customerLifecycleStage = customer?.lifecycleStage ?? null;

  // ── Form state ──
  const [serviceTypeId, setServiceTypeId] = React.useState<string | null>(null);
  const [date, setDate] = React.useState<string | null>(null);
  const [slotStartsAt, setSlotStartsAt] = React.useState<string | null>(null);
  const [isVirtual, setIsVirtual] = React.useState(false);
  const [meetingUrl, setMeetingUrl] = React.useState("");
  const [comments, setComments] = React.useState("");

  // ── Data ──
  const serviceTypes = useServiceTypes();
  const createAppointment = useCreateAppointment();

  const selectedType = React.useMemo(
    () => serviceTypes.data?.find((t) => t.id === serviceTypeId) ?? null,
    [serviceTypes.data, serviceTypeId],
  );

  const durationMinutes =
    selectedType?.durationMinutes && selectedType.durationMinutes > 0
      ? selectedType.durationMinutes
      : DEFAULT_DURATION;

  const dayRange = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      from: toISODate(today),
      to: toISODate(addDays(today, DAY_RANGE - 1)),
    };
  }, []);

  const availabilityDays = useAvailabilityDays({
    staffUserId,
    from: dayRange.from,
    to: dayRange.to,
    durationMinutes,
    enabled: !!selectedType && open,
  });

  const availabilitySlots = useAvailabilitySlots({
    staffUserId,
    date: date ?? "",
    durationMinutes,
    enabled: !!date && !!selectedType && open,
  });

  // ── Effects ──

  // Reset on open. We intentionally exclude pickedCustomer's segment
  // from the dep array — picking a customer would otherwise wipe the
  // form mid-flow. The VIP default lives in a separate effect below.
  React.useEffect(() => {
    if (!open) return;
    setPickedCustomer(null);
    setDate(defaultStartsAt ? toISODate(new Date(defaultStartsAt)) : null);
    setSlotStartsAt(null);
    setServiceTypeId(null);
    setIsVirtual(false);
    setMeetingUrl("");
    setComments("");
    createAppointment.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultStartsAt]);

  // VIP default — preselect vip_cabin if the customer is VIP and the
  // service types have loaded. Only runs while the user hasn't picked
  // anything yet, so it never overrides an explicit choice.
  React.useEffect(() => {
    if (!open) return;
    if (serviceTypeId !== null) return;
    if (customerLifecycleStage !== "vip") return;
    const vipFirst = serviceTypes.data?.find((t) => t.code === "vip_cabin");
    if (vipFirst) setServiceTypeId(vipFirst.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerLifecycleStage, serviceTypes.data]);

  // Slot is downstream of service and day — clear it when either changes.
  React.useEffect(() => {
    setSlotStartsAt(null);
  }, [date, serviceTypeId]);

  // ── Computed ──
  const recommendedId = React.useMemo(() => {
    if (customerLifecycleStage !== "vip") return null;
    return serviceTypes.data?.find((t) => t.code === "vip_cabin")?.id ?? null;
  }, [customerLifecycleStage, serviceTypes.data]);

  const canConfirm =
    !!customerId &&
    !!selectedType &&
    !!slotStartsAt &&
    !createAppointment.isPending;

  // ── Handlers ──
  function handleConfirm() {
    if (!canConfirm || !customerId || !selectedType || !slotStartsAt) return;
    createAppointment.mutate(
      {
        customerId,
        serviceTypeId: selectedType.id,
        startTime: new Date(slotStartsAt),
        durationMinutes,
        isVirtual,
        ...(isVirtual && meetingUrl.trim()
          ? { meetingUrl: meetingUrl.trim() }
          : {}),
        ...(comments.trim() ? { notes: comments.trim() } : {}),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleConfirm();
    }
  }

  const needsCustomerPick = !providedCustomerId;
  const isVip = customerLifecycleStage === "vip";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" onKeyDown={onKeyDown}>
        <SheetHeader>
          <SheetTitle>Nueva cita</SheetTitle>
          {customer && providedCustomerId ? (
            <PickedCustomerInline
              customerName={customerName}
              isVip={isVip}
            />
          ) : null}
        </SheetHeader>

        <SheetBody className="space-y-7!">
          {needsCustomerPick ? (
            <Section label="Para quién">
              <CustomerSearchField
                value={pickedCustomer}
                onChange={setPickedCustomer}
                autoFocus
              />
            </Section>
          ) : null}

          {customerId ? (
            <Section label="Servicio">
              <ServiceGrid
                serviceTypes={serviceTypes.data ?? []}
                selectedId={serviceTypeId}
                recommendedId={recommendedId}
                onSelect={setServiceTypeId}
                isLoading={serviceTypes.isLoading}
              />
            </Section>
          ) : null}

          {selectedType ? (
            <Section label="Día">
              <DayStrip
                fromIso={dayRange.from}
                count={DAY_RANGE}
                availability={availabilityDays.data ?? []}
                selectedIso={date}
                onSelect={setDate}
                isLoading={availabilityDays.isLoading}
              />
            </Section>
          ) : null}

          {selectedType && date ? (
            <Section label="Hora">
              <SlotGrid
                slots={availabilitySlots.data ?? []}
                selectedStartsAt={slotStartsAt}
                onSelect={setSlotStartsAt}
                isLoading={availabilitySlots.isLoading}
              />
            </Section>
          ) : null}

          {selectedType && slotStartsAt ? (
            <>
              <Section label="Vista previa">
                <BookingSummary
                  startsAt={slotStartsAt}
                  durationMinutes={durationMinutes}
                  serviceName={selectedType.displayName}
                  serviceColor={selectedType.color}
                  customerName={customerName}
                />
              </Section>

              <Section label="Modalidad">
                <VirtualToggle
                  checked={isVirtual}
                  onChange={setIsVirtual}
                  meetingUrl={meetingUrl}
                  onMeetingUrlChange={setMeetingUrl}
                />
              </Section>

              <Section label="Nota" optional>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  disabled={createAppointment.isPending}
                  placeholder="Lo que la clienta pidió, lo que quieres recordar…"
                  className={cn(
                    "w-full resize-none rounded-lg border border-border/50 bg-card px-3 py-2 text-[13.5px] text-foreground outline-none transition-colors",
                    "placeholder:text-muted-foreground/60",
                    "focus-visible:border-foreground/25",
                  )}
                />
              </Section>
            </>
          ) : null}

          {createAppointment.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-[12.5px] text-destructive">
                No se pudo agendar la cita. Intenta de nuevo.
              </p>
            </div>
          ) : null}
        </SheetBody>

        {/* Sticky footer: notification disclosure + actions */}
        <div className="border-t border-border/60 bg-muted/30">
          <p className="px-6 pt-3 text-[11px] text-muted-foreground">
            {canConfirm
              ? "Se enviará una confirmación por WhatsApp a la clienta."
              : "Completa los campos para agendar."}
          </p>
          <SheetFooter className="border-t-0 bg-transparent">
            <SheetClose>
              <Button variant="ghost" disabled={createAppointment.isPending}>
                Cancelar
              </Button>
            </SheetClose>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="bg-[var(--ba-accent)] text-[var(--ba-accent-foreground)] hover:bg-[var(--ba-accent)]/90"
            >
              {createAppointment.isPending ? "Agendando…" : "Agendar cita"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Section({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline gap-1.5">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </h3>
        {optional ? (
          <span className="text-[10px] text-muted-foreground/60">
            opcional
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PickedCustomerInline({
  customerName,
  isVip,
}: {
  customerName: string;
  isVip: boolean;
}) {
  return (
    <div className="mt-1 flex items-center gap-2 text-[12.5px] text-muted-foreground">
      <Avatar name={customerName} size="xs" />
      <span className="text-foreground">{customerName}</span>
      {isVip ? (
        <Badge variant="success" size="sm">
          VIP
        </Badge>
      ) : null}
    </div>
  );
}

function VirtualToggle({
  checked,
  onChange,
  meetingUrl,
  onMeetingUrlChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  meetingUrl: string;
  onMeetingUrlChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label
        className={cn(
          "flex cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-[13.5px] transition-colors",
          checked
            ? "border-[var(--ba-accent)]/30 bg-[var(--ba-accent-soft)]/40"
            : "border-border/50 bg-card hover:border-foreground/15",
        )}
      >
        <span className="flex items-center gap-2 text-foreground">
          <VideoGlyphInline className="size-4 text-muted-foreground" />
          Cita virtual
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-[var(--ba-accent)]"
        />
      </label>

      {checked ? (
        <input
          type="url"
          value={meetingUrl}
          onChange={(e) => onMeetingUrlChange(e.target.value)}
          placeholder="Pega aquí el link de la videollamada (opcional)"
          className={cn(
            "w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors",
            "placeholder:text-muted-foreground/60",
            "focus-visible:border-foreground/25",
          )}
        />
      ) : null}
    </div>
  );
}

function VideoGlyphInline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3z" />
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
