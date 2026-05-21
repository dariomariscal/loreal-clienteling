"use client";

import * as React from "react";
import {
  useCustomerCommunications,
  useCreateCommunication,
  useCustomerConsents,
  useTemplates,
  type Communication,
  type MessageTemplate,
  type Product,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ProductPicker } from "@/components/dashboard/product-picker";
import { cn } from "@/lib/utils";

// ── Conversation sheet — iMessage-style thread ─────────────────────
// Top: channel tabs (WA / SMS / Email) showing consent state per channel.
// Middle: scrollable message bubbles grouped by day.
// Bottom: composer with template chips, subject (email only), body.

interface MessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

const CHANNELS = [
  {
    value: "whatsapp",
    label: "WhatsApp",
    consentType: "marketing_whatsapp",
    accent: "#25D366",
  },
  {
    value: "sms",
    label: "SMS",
    consentType: "marketing_sms",
    accent: "#6B7280",
  },
  {
    value: "email",
    label: "Email",
    consentType: "marketing_email",
    accent: "#3B82F6",
  },
] as const;

type ChannelValue = (typeof CHANNELS)[number]["value"];

const FOLLOWUP_TYPES = [
  { value: "3_months", label: "Seguimiento 3m" },
  { value: "6_months", label: "Seguimiento 6m" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "replenishment", label: "Reposición" },
  { value: "special_event", label: "Evento" },
  { value: "custom", label: "Personalizado" },
] as const;

export function MessageSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: MessageSheetProps) {
  const [channel, setChannel] = React.useState<ChannelValue>("whatsapp");
  const [body, setBody] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [followupType, setFollowupType] = React.useState<string>("custom");
  const [attachments, setAttachments] = React.useState<Product[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const { data: comms = [], isLoading: commsLoading } =
    useCustomerCommunications(customerId);
  const { data: consents = [] } = useCustomerConsents(customerId);
  const { data: templates = [] } = useTemplates();
  const createComm = useCreateCommunication();

  React.useEffect(() => {
    if (open) {
      setBody("");
      setSubject("");
      setFollowupType("custom");
      setAttachments([]);
      setPickerOpen(false);
      createComm.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleAttachment(product: Product) {
    setAttachments((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  }

  const attachmentIds = React.useMemo(
    () => new Set(attachments.map((a) => a.id)),
    [attachments],
  );

  const activeConsents = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of consents) {
      if (!c.revokedAt) set.add(c.type);
    }
    return set;
  }, [consents]);

  const channelMeta = CHANNELS.find((c) => c.value === channel)!;
  const hasConsent = activeConsents.has(channelMeta.consentType);

  // Templates for the current channel, sorted with the active followup type
  // first so a likely match is one tap away.
  const channelTemplates = React.useMemo(
    () =>
      templates
        .filter((t) => t.active && t.channel === channel)
        .sort((a, b) => {
          if (a.followupType === followupType) return -1;
          if (b.followupType === followupType) return 1;
          return 0;
        }),
    [templates, channel, followupType],
  );

  // Channel thread — full history for context, but the composer only sends
  // on the active channel. Sorted oldest first (top) → newest at bottom,
  // matching SMS/iMessage convention.
  const channelComms = React.useMemo(
    () =>
      comms
        .filter((c) => c.channel === channel)
        .sort(
          (a, b) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        ),
    [comms, channel],
  );

  const grouped = React.useMemo(() => groupByDay(channelComms), [channelComms]);

  function applyTemplate(t: MessageTemplate) {
    setBody(t.body);
    setFollowupType(t.followupType);
  }

  function handleSend() {
    const trimmed = body.trim();
    if (!hasConsent || createComm.isPending) return;
    if (!trimmed && attachments.length === 0) return;

    // Compose the final payload: prose first, then a readable block of
    // attached products. The provider gateway later renders this into a
    // WhatsApp/SMS list or an email card; here we keep it plain so it
    // looks fine no matter the channel.
    const productLines =
      attachments.length === 0
        ? ""
        : "\n\n— Productos —\n" +
          attachments
            .map((p) => {
              const brand = p.brand?.displayName ?? "";
              const price = Number(p.price);
              const priceStr =
                price > 0
                  ? `$${price.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`
                  : "";
              return `• ${brand ? brand + " · " : ""}${p.name}${priceStr ? ` — ${priceStr}` : ""}`;
            })
            .join("\n");

    const finalBody = (trimmed + productLines).slice(0, 5000) || trimmed;

    createComm.mutate(
      {
        customerId,
        channel,
        body: finalBody,
        followupType,
        ...(channel === "email" && subject.trim()
          ? { subject: subject.trim().slice(0, 200) }
          : {}),
      },
      {
        onSuccess: () => {
          setBody("");
          setSubject("");
          setAttachments([]);
        },
      },
    );
  }

  const canSend =
    (body.trim().length > 0 || attachments.length > 0) &&
    hasConsent &&
    !createComm.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Conversación</SheetTitle>
          <SheetDescription>
            Con <span className="text-foreground">{customerName}</span>
          </SheetDescription>
        </SheetHeader>

        {/* Channel tabs — colored when active, consent indicator on each */}
        <div className="flex shrink-0 gap-1 border-b border-border/40 px-5 py-3">
          {CHANNELS.map((c) => {
            const active = channel === c.value;
            const consent = activeConsents.has(c.consentType);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setChannel(c.value)}
                className={cn(
                  "group/tab flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                  active
                    ? "bg-foreground text-background"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                style={active ? { backgroundColor: c.accent } : undefined}
              >
                <ChannelIcon channel={c.value} className="size-4" />
                <span className="font-medium">{c.label}</span>
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    consent
                      ? active
                        ? "bg-white/80"
                        : "bg-success"
                      : "bg-destructive/60",
                  )}
                  aria-label={consent ? "Con consentimiento" : "Sin consentimiento"}
                />
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          style={{ background: "color-mix(in oklab, var(--muted) 20%, transparent)" }}
        >
          {commsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-12 w-2/3 animate-pulse rounded-2xl bg-muted/40",
                    i % 2 ? "ml-auto" : "",
                  )}
                />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyThread channel={channel} hasConsent={hasConsent} />
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <DayGroup
                  key={g.day}
                  day={g.day}
                  comms={g.comms}
                  accent={channelMeta.accent}
                  customerName={customerName}
                />
              ))}
            </div>
          )}
        </div>

        {/* Template chips */}
        {channelTemplates.length > 0 && (
          <div className="shrink-0 border-t border-border/30 bg-background px-5 py-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Plantillas
            </p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {channelTemplates.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-foreground transition-colors hover:border-foreground/40 hover:bg-muted"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="shrink-0 space-y-2.5 border-t border-border/40 bg-background px-5 py-4">
          {!hasConsent && (
            <Badge variant="destructive" className="w-full justify-center text-[11px]">
              La clienta no ha dado consentimiento para {channelMeta.label}.
            </Badge>
          )}

          {channel === "email" && (
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto"
              disabled={createComm.isPending || !hasConsent}
              maxLength={200}
              className={cn(
                "h-9 w-full rounded-lg border border-border bg-transparent px-3 text-sm outline-none",
                "placeholder:text-muted-foreground/50",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                "disabled:opacity-50",
              )}
            />
          )}

          {/* Attached products — preview chips above the textarea */}
          {attachments.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {attachments.map((p) => (
                <li
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card py-1 pl-1 pr-2"
                >
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </span>
                  <span className="max-w-[180px] truncate text-[12px] text-foreground">
                    {p.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAttachment(p)}
                    disabled={createComm.isPending}
                    aria-label={`Quitar ${p.name}`}
                    className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <XIcon className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={createComm.isPending || !hasConsent}
              aria-label="Adjuntar producto"
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all",
                "hover:border-foreground/40 hover:text-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
                attachments.length > 0 && "border-foreground text-foreground",
              )}
            >
              <PaperclipIcon className="size-4" />
            </button>

            <div className="flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={composerPlaceholder(channel)}
                rows={2}
                maxLength={5000}
                disabled={createComm.isPending || !hasConsent}
                className={cn(
                  "w-full resize-none rounded-2xl border border-border bg-transparent px-3.5 py-2.5 text-sm leading-snug outline-none transition-colors",
                  "placeholder:text-muted-foreground/50",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                  "disabled:opacity-50",
                )}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="icon-lg"
              className="shrink-0 rounded-full"
              style={canSend ? { backgroundColor: channelMeta.accent } : undefined}
            >
              {createComm.isPending ? (
                <span className="text-[10px]">…</span>
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>

          {/* Followup type — small footer, mostly defaulted by template */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="uppercase tracking-[0.1em]">Tipo</span>
            <div className="flex flex-wrap gap-1">
              {FOLLOWUP_TYPES.map((f) => {
                const active = followupType === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFollowupType(f.value)}
                    disabled={createComm.isPending || !hasConsent}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {createComm.isError && (
            <Badge variant="destructive" className="w-full justify-center">
              No se pudo enviar el mensaje. Intenta otra vez.
            </Badge>
          )}
        </div>

        {/* Product picker overlay — slides up from the bottom on top of the
            thread; the composer + picker live in the same flex column so
            the user can keep typing context in mind. */}
        {pickerOpen && (
          <div className="absolute inset-x-0 bottom-0 top-[64px] z-10 flex flex-col bg-background">
            <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3">
              <div>
                <p className="font-heading text-sm text-foreground">
                  Adjuntar productos
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {attachments.length === 0
                    ? "Toca un producto para adjuntarlo al mensaje."
                    : `${attachments.length} ${attachments.length === 1 ? "adjunto" : "adjuntos"}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPickerOpen(false)}
              >
                Listo
              </Button>
            </div>
            <div className="min-h-0 flex-1 px-5 py-4">
              <ProductPicker
                onSelect={toggleAttachment}
                selectedIds={attachmentIds}
                multi
                gridClassName="grid-cols-2 sm:grid-cols-3"
              />
            </div>
          </div>
        )}

        <SheetClose className="hidden" />
      </SheetContent>
    </Sheet>
  );
}

// ── Pieces ────────────────────────────────────────────────────────

function DayGroup({
  day,
  comms,
  accent,
  customerName,
}: {
  day: string;
  comms: Communication[];
  accent: string;
  customerName: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70">
        {day}
      </p>
      {comms.map((c) => (
        <Bubble key={c.id} comm={c} accent={accent} customerName={customerName} />
      ))}
    </div>
  );
}

function Bubble({
  comm,
  accent,
  customerName,
}: {
  comm: Communication;
  accent: string;
  customerName: string;
}) {
  // We don't yet model inbound/outbound; everything sent from the BA app is
  // outbound. Render all bubbles aligned right with the channel accent.
  const time = new Date(comm.sentAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex justify-end">
      <div className="flex max-w-[78%] flex-col items-end gap-0.5">
        {comm.subject && (
          <p className="px-3 text-[10px] font-medium text-muted-foreground">
            {comm.subject}
          </p>
        )}
        <div
          className="rounded-2xl px-3.5 py-2 text-sm leading-snug text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          <p className="whitespace-pre-wrap">{comm.body}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground">
          <DeliveryStatus comm={comm} />
          <span>·</span>
          <time>{time}</time>
        </div>
      </div>
    </div>
  );
}

function DeliveryStatus({ comm }: { comm: Communication }) {
  if (comm.respondedAt) return <span className="text-success">Respondido</span>;
  if (comm.readAt) return <span className="text-info">Leído</span>;
  if (comm.deliveredAt) return <span>Entregado</span>;
  return <span>Enviado</span>;
}

function EmptyThread({
  channel,
  hasConsent,
}: {
  channel: ChannelValue;
  hasConsent: boolean;
}) {
  const channelLabel =
    CHANNELS.find((c) => c.value === channel)?.label ?? channel;
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center">
      <ChannelIcon
        channel={channel}
        className="size-7 text-muted-foreground/50"
      />
      <p className="font-heading text-sm text-foreground">
        Sin mensajes por {channelLabel}
      </p>
      <p className="text-[12px] leading-snug text-muted-foreground">
        {hasConsent
          ? "Escribe abajo o usa una plantilla para empezar."
          : `La clienta debe dar consentimiento para ${channelLabel} antes de poder enviar.`}
      </p>
    </div>
  );
}

function ChannelIcon({
  channel,
  className,
}: {
  channel: ChannelValue;
  className?: string;
}) {
  if (channel === "whatsapp") {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.95.56 3.76 1.52 5.3L2 22l4.83-1.5A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.5 14.18c-.24.68-1.18 1.27-1.93 1.43-.51.11-1.17.2-3.4-.74-2.84-1.18-4.66-4.07-4.8-4.26-.14-.19-1.13-1.5-1.13-2.86 0-1.36.7-2.03.95-2.31.21-.23.55-.34.86-.34h.62c.2 0 .47-.03.74.56.27.6.92 2.07 1 2.23.08.16.13.34.03.55-.1.21-.15.34-.3.52-.15.18-.32.4-.46.54-.15.15-.3.32-.13.62.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.13.65-.08.18-.21.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.76.83 2.07.98.3.15.5.22.58.34.07.12.07.7-.17 1.38z" />
      </svg>
    );
  }
  if (channel === "sms") {
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
        <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6l-3 3v-3H4a2 2 0 0 1-2-2V4z" />
      </svg>
    );
  }
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
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 4.5 5.5 4 5.5-4" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 14 12-6L2 2v5l8 1-8 1v5z" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function composerPlaceholder(channel: ChannelValue): string {
  if (channel === "whatsapp") return "Mensaje por WhatsApp…";
  if (channel === "sms") return "Mensaje por SMS…";
  return "Cuerpo del email…";
}

interface DayBucket {
  day: string;
  comms: Communication[];
}

function groupByDay(comms: Communication[]): DayBucket[] {
  const buckets = new Map<string, Communication[]>();
  for (const c of comms) {
    const day = formatDayHeader(new Date(c.sentAt));
    const arr = buckets.get(day) ?? [];
    arr.push(c);
    buckets.set(day, arr);
  }
  return Array.from(buckets.entries()).map(([day, comms]) => ({ day, comms }));
}

function formatDayHeader(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today.getTime() - d.getTime()) / (24 * 3600 * 1000),
  );
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) {
    return date.toLocaleDateString("es-MX", { weekday: "long" });
  }
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PaperclipIcon({ className }: { className?: string }) {
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
      <path d="M11.5 7.5l-4.5 4.5a2.5 2.5 0 0 1-3.5-3.5L8 4a3.5 3.5 0 0 1 5 5L8.5 13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
