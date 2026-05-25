"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { MessageChannelIcon } from "@/components/advisor/message-channel-icon";
import { useCustomer } from "@/lib/hooks/use-customers";
import { useCustomerMessages } from "@/lib/hooks/use-customer-detail";
import { useCreateMessage } from "@/lib/hooks/use-messages";
import { cn } from "@/lib/utils";

interface Props {
  customerId: string;
}

type Channel = "whatsapp" | "sms" | "email";

export function ConversationThread({ customerId }: Props) {
  const customer = useCustomer(customerId);
  const messages = useCustomerMessages(customerId);
  const createMessage = useCreateMessage();
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [body, setBody] = useState("");

  const sortedMessages = useMemo(
    () =>
      [...(messages.data ?? [])].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      ),
    [messages.data],
  );

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    await createMessage.mutateAsync({
      customerId,
      channel,
      body: trimmed,
      direction: "outbound",
    } as Parameters<typeof createMessage.mutateAsync>[0]);
    setBody("");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-8 py-4">
        <CustomerAvatar
          firstName={customer.data?.firstName ?? "?"}
          lastName={customer.data?.lastName ?? null}
          avatarUrl={customer.data?.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {customer.data
              ? `${customer.data.firstName} ${customer.data.lastName}`
              : "Loading…"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {customer.data?.preferredChannel
              ? `Prefers ${customer.data.preferredChannel}`
              : ""}
          </p>
        </div>
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto px-8 py-6">
        {sortedMessages.length === 0 ? (
          <li className="text-center text-sm text-muted-foreground">
            No messages yet — start the conversation.
          </li>
        ) : (
          sortedMessages.map((m) => {
            const outbound = m.direction === "outbound";
            return (
              <li
                key={m.id}
                className={cn(
                  "flex max-w-[78%] flex-col gap-1",
                  outbound ? "ml-auto items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    outbound
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.body}
                </div>
                <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <MessageChannelIcon channel={m.channel} className="size-3" />
                  {format(new Date(m.sentAt), "d MMM HH:mm", { locale: es })}
                  {outbound ? ` · ${m.status}` : ""}
                </p>
              </li>
            );
          })
        )}
      </ol>

      <footer className="border-t border-border bg-background px-8 py-4">
        <div className="mb-2 flex items-center gap-1.5">
          {(["whatsapp", "sms", "email"] satisfies Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                channel === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageChannelIcon channel={c} className="size-3" />
              {c}
            </button>
          ))}
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Send via ${channel}…`}
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={handleSend}
            disabled={createMessage.isPending || !body.trim()}
          >
            Send
          </Button>
        </div>
      </footer>
    </div>
  );
}
