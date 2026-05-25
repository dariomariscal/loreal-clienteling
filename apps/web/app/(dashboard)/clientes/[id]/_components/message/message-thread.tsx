"use client";

import type { Message } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { CHANNELS, type ChannelValue } from "./constants";
import { ChannelIcon } from "./icons";

interface DayBucket {
  day: string;
  messages: Message[];
}

export function groupByDay(messages: Message[]): DayBucket[] {
  const buckets = new Map<string, Message[]>();
  for (const m of messages) {
    const day = formatDayHeader(new Date(m.sentAt));
    const arr = buckets.get(day) ?? [];
    arr.push(m);
    buckets.set(day, arr);
  }
  return Array.from(buckets.entries()).map(([day, messages]) => ({ day, messages }));
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

export function MessageThread({
  messages,
  customerName,
  loading,
  channel,
  hasConsent,
}: {
  messages: Message[];
  customerName: string;
  loading: boolean;
  channel: ChannelValue;
  hasConsent: boolean;
}) {
  const grouped = groupByDay(messages);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      style={{
        background: "color-mix(in oklab, var(--muted) 20%, transparent)",
      }}
    >
      {loading ? (
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
              messages={g.messages}
              customerName={customerName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayGroup({
  day,
  messages,
  customerName,
}: {
  day: string;
  messages: Message[];
  customerName: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70">
        {day}
      </p>
      {messages.map((m) => (
        <Bubble key={m.id} message={m} customerName={customerName} />
      ))}
    </div>
  );
}

function Bubble({
  message,
}: {
  message: Message;
  customerName: string;
}) {
  const time = new Date(message.sentAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const outbound = message.direction === "outbound";

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[78%] flex-col gap-0.5",
          outbound ? "items-end" : "items-start",
        )}
      >
        {message.subject && (
          <p className="px-3 text-[10px] font-medium text-muted-foreground">
            {message.subject}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm",
            outbound
              ? "bg-foreground text-background"
              : "bg-muted text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap">{message.body}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground">
          {outbound ? (
            <>
              <DeliveryStatus message={message} />
              <span>·</span>
            </>
          ) : null}
          <time>{time}</time>
        </div>
      </div>
    </div>
  );
}

function DeliveryStatus({ message }: { message: Message }) {
  if (message.respondedAt) return <span className="text-success">Respondido</span>;
  if (message.readAt) return <span className="text-info">Leído</span>;
  if (message.deliveredAt) return <span>Entregado</span>;
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
