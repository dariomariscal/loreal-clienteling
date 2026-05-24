"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ViewHeader } from "../../../../_components/view-header";
import {
  MessageBubble,
  AISuggestionChip,
} from "@/components/ba";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BackGlyph } from "@/components/ui/glyphs";
import { Avatar } from "@/components/ui/avatar";
import { useCustomer, useCustomerCommunications } from "@/lib/hooks";
import { useGenerateMessageSuggestions } from "@/lib/hooks/use-ai";
import { useCreateCommunication } from "@/lib/hooks";
import type { MessageSuggestion } from "@loreal/contracts";

interface MessagesScreenProps {
  customerId: string;
}

// Messages screen — WhatsApp-style conversation.
//
// Asymmetric bubbles (direction comes straight from the API — outbound
// from María, inbound from the customer). Three AI suggestion pills sit
// above the input. Sends are optimistic: the bubble appears immediately
// in a "pending" state, then either resolves silently (server returns)
// or sticks with a destructive border + "no se envió" hint on failure
// so María never thinks something delivered when it didn't.
export function MessagesScreen({ customerId }: MessagesScreenProps) {
  const router = useRouter();
  const customer = useCustomer(customerId);
  const comms = useCustomerCommunications(customerId);
  const sendMessage = useCreateCommunication();
  const generateSuggestions = useGenerateMessageSuggestions();

  const [draft, setDraft] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<MessageSuggestion[]>([]);
  const [pending, setPending] = React.useState<
    Array<{ id: string; body: string; status: "pending" | "failed" }>
  >([]);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom whenever the conversation grows or a new
  // pending bubble appears. The behavior is "smooth" so it doesn't feel
  // jerky between messages from the same burst.
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [comms.data, pending]);

  // Generate suggestions once, on mount.
  React.useEffect(() => {
    generateSuggestions.mutate(customerId, {
      onSuccess: (data) => setSuggestions(data),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const customerFirstName = customer.data?.firstName ?? "";

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    const tempId = `pending-${Date.now()}`;
    setPending((prev) => [...prev, { id: tempId, body, status: "pending" }]);
    setDraft("");

    try {
      await sendMessage.mutateAsync({
        customerId,
        channel: "whatsapp",
        body,
        direction: "outbound",
        followupType: "custom",
      });
      // Once the server has it, drop the optimistic bubble — the real
      // one will arrive via the comms list refetch.
      setPending((prev) => prev.filter((p) => p.id !== tempId));
    } catch {
      setPending((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, status: "failed" } : p)),
      );
    }
  }

  function handlePickSuggestion(suggestion: MessageSuggestion) {
    setDraft(suggestion.text);
  }

  const messages = sortMessages(comms.data ?? []);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={
          <span className="flex items-center gap-2.5">
            <Avatar
              name={
                customer.data
                  ? `${customer.data.firstName} ${customer.data.lastName}`
                  : "Clienta"
              }
              size="sm"
            />
            <span>
              {customer.data
                ? `${customer.data.firstName} ${customer.data.lastName}`
                : "Clienta"}
            </span>
          </span>
        }
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push(`/ba/customers/${customerId}`)}
            aria-label="Volver a la ficha"
          >
            <BackGlyph className="size-4" />
          </Button>
        }
      />

      {/* Scrollable conversation */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-2">
          {comms.isLoading ? (
            <ConversationSkeleton />
          ) : messages.length === 0 && pending.length === 0 ? (
            <EmptyConversation customerFirstName={customerFirstName} />
          ) : (
            <>
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const showTime =
                  !prev ||
                  Math.abs(
                    new Date(m.sentAt).getTime() - new Date(prev.sentAt).getTime(),
                  ) > 5 * 60_000;
                return (
                  <React.Fragment key={m.id}>
                    {showTime ? <TimestampDivider iso={m.sentAt} /> : null}
                    <MessageBubble
                      body={m.body}
                      direction={m.direction}
                      sentAt={m.sentAt}
                      status={mapBubbleStatus(m.status, m.readAt)}
                    />
                  </React.Fragment>
                );
              })}
              {pending.map((p) => (
                <MessageBubble
                  key={p.id}
                  body={p.body}
                  direction="outbound"
                  status={p.status}
                />
              ))}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggestions strip + input */}
      <footer className="border-t border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6 pb-4 pt-3">
          {suggestions.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <AISuggestionChip
                  key={`${s.intent}-${i}`}
                  text={s.text}
                  rationale={s.rationale}
                  onSelect={() => handlePickSuggestion(s)}
                />
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribir mensaje…"
              rows={1}
              className="max-h-32 min-h-[40px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!draft.trim() || sendMessage.isPending}
              className="bg-[var(--ba-accent)] text-[var(--ba-accent-foreground)] hover:bg-[var(--ba-accent)]/90"
            >
              Enviar
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function sortMessages<T extends { sentAt: string }>(messages: T[]): T[] {
  return [...messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

// Map the backend's full lifecycle (queued/sending/sent/delivered/read/
// failed/received) to the four UI-meaningful states the bubble cares
// about: pending, sent, read, failed. Everything in flight reads as
// "pending"; explicit read receipts win over generic "delivered".
function mapBubbleStatus(
  status:
    | "queued"
    | "sending"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "received",
  readAt: string | null,
): "pending" | "sent" | "delivered" | "read" | "failed" | undefined {
  if (status === "failed") return "failed";
  if (status === "queued" || status === "sending") return "pending";
  if (readAt) return "read";
  return undefined;
}

// ── Sub-components ─────────────────────────────────────────────────

function TimestampDivider({ iso }: { iso: string }) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const label = isToday
    ? d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("es-MX", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
  return (
    <div className="flex justify-center py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

function EmptyConversation({ customerFirstName }: { customerFirstName: string }) {
  return (
    <div className="pt-16 text-center">
      <p className="text-[14px] text-muted-foreground">
        Aún no han hablado por aquí.
      </p>
      <p className="mt-1 text-[12.5px] text-muted-foreground/80">
        Las sugerencias de arriba son un buen punto de partida
        {customerFirstName ? ` con ${customerFirstName}` : ""}.
      </p>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div
            className="h-10 w-48 animate-pulse rounded-2xl bg-muted/50"
            style={{ width: `${30 + ((i * 13) % 40)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
