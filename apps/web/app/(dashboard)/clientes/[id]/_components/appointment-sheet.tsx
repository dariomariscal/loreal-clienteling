"use client";

import * as React from "react";
import {
  useAppointmentEventTypes,
  useAvailabilityDays,
  useAvailabilitySlots,
  useCreateAppointment,
  useCustomerSearch,
  type AppointmentEventType,
  type Customer,
} from "@/lib/hooks";
import { Avatar } from "@/components/ui/avatar";
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

// ── Appointment composer — Calendly-style 3-step wizard ────────────
// Step 1: service type (chips with icon + duration)
// Step 2: day strip (next 14 days, disabled days are dimmed not hidden)
// Step 3: slot grid (chips of available start times)
// Live preview at the bottom in the service's color, then confirm.

interface AppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, skips the client picker step and pre-fills the customer. */
  customerId?: string;
  customerName?: string;
  customerSegment?: string | null;
  baUserId: string;
  /**
   * Optional ISO string from a clicked empty slot on the agenda. We use it
   * to pre-select the day chip; the time chip only auto-picks when the BA
   * tapped an exact slot, which we infer from the minute value (non-zero,
   * non-15-multiple typically means it was rounded from a real click).
   */
  defaultStartsAt?: string | null;
}

const EVENT_TYPE_ICON: Record<string, string> = {
  cabin_service: "✨",
  facial: "💆",
  anniversary_event: "🎁",
  vip_cabin: "👑",
  product_followup: "📦",
  custom: "📌",
};

const DEFAULT_DURATION = 60;
const DAY_RANGE = 14;

export function AppointmentSheet({
  open,
  onOpenChange,
  customerId: providedCustomerId,
  customerName: providedCustomerName,
  customerSegment: providedCustomerSegment,
  baUserId,
  defaultStartsAt,
}: AppointmentSheetProps) {
  // Customer picker — only relevant when launched without a pre-filled
  // customer (from /agenda or the global + Create menu).
  const [pickedCustomer, setPickedCustomer] = React.useState<Customer | null>(
    null,
  );
  const customerId = providedCustomerId ?? pickedCustomer?.id ?? null;
  const customerName =
    providedCustomerName ??
    (pickedCustomer
      ? `${pickedCustomer.firstName} ${pickedCustomer.lastName}`
      : "");
  const customerSegment =
    providedCustomerSegment ?? pickedCustomer?.lifecycleSegment ?? null;
  const needsCustomerPick = !providedCustomerId;

  const [eventTypeId, setEventTypeId] = React.useState<string | null>(null);
  const [date, setDate] = React.useState<string | null>(null);
  const [slotStartsAt, setSlotStartsAt] = React.useState<string | null>(null);
  const [isVirtual, setIsVirtual] = React.useState(false);
  const [comments, setComments] = React.useState("");

  const { data: eventTypes = [], isLoading: typesLoading } =
    useAppointmentEventTypes();
  const createAppointment = useCreateAppointment();

  // ── Reset every time the sheet opens — also recommends VIP type if the
  // customer's lifecycle segment is "vip" so the BA's first tap is fast.
  React.useEffect(() => {
    if (!open) return;
    setPickedCustomer(null);
    // Seed day from defaultStartsAt (click on empty slot in /agenda).
    if (defaultStartsAt) {
      setDate(toISODate(new Date(defaultStartsAt)));
    } else {
      setDate(null);
    }
    setSlotStartsAt(null);
    setIsVirtual(false);
    setComments("");
    createAppointment.reset();

    if (eventTypes.length > 0) {
      const vipFirst =
        customerSegment === "vip"
          ? eventTypes.find((t) => t.code === "vip_cabin")
          : undefined;
      setEventTypeId(vipFirst?.id ?? null);
    } else {
      setEventTypeId(null);
    }
    // We intentionally exclude createAppointment so reset doesn't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerSegment, eventTypes.length, defaultStartsAt]);

  const selectedType = React.useMemo(
    () => eventTypes.find((t) => t.id === eventTypeId) ?? null,
    [eventTypes, eventTypeId],
  );

  const durationMinutes =
    selectedType?.durationMinutes && selectedType.durationMinutes > 0
      ? selectedType.durationMinutes
      : DEFAULT_DURATION;

  // ── Day range: today through today+13, formatted as YYYY-MM-DD ───
  const dayRange = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = toISODate(today);
    const to = toISODate(addDays(today, DAY_RANGE - 1));
    return { from, to };
  }, []);

  const { data: availabilityDays = [], isLoading: daysLoading } =
    useAvailabilityDays({
      baUserId,
      from: dayRange.from,
      to: dayRange.to,
      durationMinutes,
      enabled: !!selectedType && open,
    });

  const { data: availabilitySlots = [], isLoading: slotsLoading } =
    useAvailabilitySlots({
      baUserId,
      date: date ?? "",
      durationMinutes,
      enabled: !!date && !!selectedType && open,
    });

  // Reset selections downstream when the service or day changes — slots
  // depend on duration/day so a stale pick would be misleading.
  React.useEffect(() => {
    setSlotStartsAt(null);
  }, [date]);

  // When the service changes we drop the slot but keep the day so the BA
  // doesn't have to re-pick it after every service tap.
  React.useEffect(() => {
    setSlotStartsAt(null);
  }, [eventTypeId]);

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
        eventTypeId: selectedType.id,
        scheduledAt: new Date(slotStartsAt),
        durationMinutes,
        isVirtual,
        ...(comments.trim() ? { comments: comments.trim() } : {}),
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
                {customerSegment === "vip" && (
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
          {/* ── Step 0 (optional): customer picker ───────────── */}
          {needsCustomerPick && (
            <Step number="·" title="Clienta">
              {pickedCustomer ? (
                <PickedCustomerCard
                  customer={pickedCustomer}
                  onChange={() => setPickedCustomer(null)}
                />
              ) : (
                <CustomerPicker onPick={setPickedCustomer} />
              )}
            </Step>
          )}

          {/* ── Step 1: service type ─────────────────────────── */}
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
                {eventTypes
                  .filter((t) => t.active)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((t) => (
                    <ServiceCard
                      key={t.id}
                      type={t}
                      selected={t.id === eventTypeId}
                      recommended={
                        customerSegment === "vip" && t.code === "vip_cabin"
                      }
                      onSelect={() => setEventTypeId(t.id)}
                    />
                  ))}
              </div>
            )}
          </Step>

          {/* ── Step 2: day strip ────────────────────────────── */}
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

          {/* ── Step 3: slot grid ────────────────────────────── */}
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

          {/* ── Preview + extras ─────────────────────────────── */}
          {selectedType && slotStartsAt && (
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Vista previa
              </p>
              <BookingPreview
                eventType={selectedType}
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
                  htmlFor="appt-comments"
                  className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Comentarios (opcional)
                </label>
                <textarea
                  id="appt-comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
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

// ── Pieces ────────────────────────────────────────────────────────

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

function ServiceCard({
  type,
  selected,
  recommended,
  onSelect,
}: {
  type: AppointmentEventType;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}) {
  const icon = EVENT_TYPE_ICON[type.code] ?? "📌";
  const color = type.color ?? "var(--accent)";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group/svc relative flex flex-col items-start gap-1 rounded-xl border bg-card p-3 text-left transition-all duration-200",
        selected
          ? "border-foreground shadow-sm"
          : "border-border/60 hover:border-foreground/30",
      )}
      style={selected ? { borderColor: color } : undefined}
    >
      {recommended && !selected && (
        <span className="absolute -top-1.5 right-2 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-success">
          Sugerido
        </span>
      )}
      <span
        className="flex size-7 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)` }}
      >
        {icon}
      </span>
      <p className="line-clamp-2 font-heading text-[13px] leading-tight text-foreground">
        {type.displayName}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {type.durationMinutes
          ? `${type.durationMinutes} min`
          : `${DEFAULT_DURATION} min`}
      </p>
    </button>
  );
}

interface DayInfo {
  iso: string;
  date: Date;
  available: boolean;
}

function DayChip({
  day,
  selected,
  onSelect,
}: {
  day: DayInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const weekday = day.date.toLocaleDateString("es-MX", { weekday: "short" });
  const num = day.date.getDate();
  const month = day.date.toLocaleDateString("es-MX", { month: "short" });

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!day.available}
      aria-pressed={selected}
      className={cn(
        "flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2 text-center transition-all duration-150",
        selected && "border-foreground bg-foreground text-background",
        !selected && day.available
          ? "border-border bg-background text-foreground hover:border-foreground/40"
          : "",
        !day.available &&
          "cursor-not-allowed border-border/30 bg-muted/10 text-muted-foreground/40",
      )}
    >
      <span className="text-[9px] uppercase tracking-wider">
        {weekday.replace(".", "")}
      </span>
      <span className="font-heading text-base leading-none tabular-nums">
        {num}
      </span>
      <span className="text-[9px] uppercase tracking-wider opacity-70">
        {month.replace(".", "")}
      </span>
    </button>
  );
}

function SlotChip({
  startsAt,
  selected,
  onSelect,
}: {
  startsAt: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const date = new Date(startsAt);
  const label = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "h-10 rounded-lg border text-sm tabular-nums transition-all duration-150",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground/40",
      )}
    >
      {label}
    </button>
  );
}

function BookingPreview({
  eventType,
  startsAt,
  durationMinutes,
  customerName,
  accent,
}: {
  eventType: AppointmentEventType;
  startsAt: string;
  durationMinutes: number;
  customerName: string;
  accent: string;
}) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const dateLabel = start.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const startLabel = start.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = end.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-card p-4"
      style={{ borderColor: accent }}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {dateLabel}
      </p>
      <p className="mt-0.5 font-heading text-lg tabular-nums text-foreground">
        {startLabel} – {endLabel}
      </p>
      <p className="mt-1 text-sm text-foreground">
        {eventType.displayName}{" "}
        <span className="text-muted-foreground">· {customerName}</span>
      </p>
    </div>
  );
}

// ── Customer picker (step 0) ──────────────────────────────────────

function CustomerPicker({ onPick }: { onPick: (c: Customer) => void }) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [], isLoading } = useCustomerSearch(debounced);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nombre, teléfono o email…"
        autoFocus
        className={cn(
          "h-10 w-full rounded-xl border border-border bg-transparent px-3.5 text-sm outline-none transition-colors",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        )}
      />
      {debounced.length >= 2 ? (
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-border/40 bg-card">
          {isLoading ? (
            <li className="px-3 py-2 text-[12px] text-muted-foreground">
              Buscando…
            </li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-muted-foreground">
              Sin coincidencias para "{debounced}".
            </li>
          ) : (
            results.slice(0, 8).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  className="flex w-full items-center gap-3 border-b border-border/30 px-3 py-2 text-left last:border-b-0 hover:bg-muted/40"
                >
                  <Avatar
                    name={`${c.firstName} ${c.lastName}`}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">
                      {c.firstName} {c.lastName}
                    </p>
                    {(c.phone || c.email) && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.phone ?? c.email}
                      </p>
                    )}
                  </div>
                  {c.lifecycleSegment === "vip" && (
                    <Badge variant="success" size="sm">
                      VIP
                    </Badge>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          Escribe al menos 2 caracteres para buscar.
        </p>
      )}
    </div>
  );
}

function PickedCustomerCard({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
      <Avatar
        name={`${customer.firstName} ${customer.lastName}`}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-[14px] text-foreground">
          {customer.firstName} {customer.lastName}
        </p>
        {(customer.phone || customer.email) && (
          <p className="truncate text-[11px] text-muted-foreground">
            {customer.phone ?? customer.email}
          </p>
        )}
      </div>
      {customer.lifecycleSegment === "vip" && (
        <Badge variant="success" size="sm">
          VIP
        </Badge>
      )}
      <button
        type="button"
        onClick={onChange}
        className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Cambiar
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildDayStrip(
  fromIso: string,
  count: number,
  availability: { date: string; hasAvailability: boolean }[],
): DayInfo[] {
  const availMap = new Map(availability.map((d) => [d.date, d.hasAvailability]));
  // fromIso is YYYY-MM-DD — parse locally to avoid UTC shift.
  const [y, m, d] = fromIso.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1);

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(base, i);
    const iso = toISODate(date);
    return {
      iso,
      date,
      // If availability hasn't loaded yet we optimistically allow the day.
      // Once the response lands, days without slots will dim — no flicker.
      available: availMap.get(iso) ?? true,
    };
  });
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
