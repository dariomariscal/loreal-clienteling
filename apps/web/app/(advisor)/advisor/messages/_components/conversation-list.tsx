"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { useMessages } from "@/lib/hooks/use-messages";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { MessageChannelIcon } from "@/components/advisor/message-channel-icon";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/hooks/use-customer-detail";

interface Props {
  activeCustomerId?: string;
}

interface ConversationPreview {
  customerId: string;
  lastMessage: Message;
  count: number;
}

export function ConversationList({ activeCustomerId }: Props) {
  const { data, isLoading } = useMessages();

  const conversations = groupByCustomer(data ?? []);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4">
        <h2 className="font-[var(--font-heading)] text-base text-foreground">
          Inbox
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : conversations.length === 0 ? (
          <AdvisorEmptyState
            title="No conversations yet"
            description="Reach out to a client to start a thread."
          />
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map((c) => (
              <li key={c.customerId}>
                <ConversationRow
                  conversation={c}
                  active={c.customerId === activeCustomerId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
}: {
  conversation: ConversationPreview;
  active: boolean;
}) {
  const { lastMessage } = conversation;
  return (
    <Link
      href={`/advisor/messages/${conversation.customerId}`}
      className={cn(
        "flex items-start gap-3 border-l-2 px-4 py-3 transition-colors",
        active
          ? "border-l-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)]"
          : "border-l-transparent hover:bg-muted/60",
      )}
      aria-current={active ? "page" : undefined}
    >
      <div className="relative">
        <CustomerAvatar firstName="?" lastName={null} size="md" />
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-foreground text-background">
          <MessageChannelIcon channel={lastMessage.channel} className="size-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {lastMessage.toAddress ?? lastMessage.fromAddress ?? "Client"}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNowStrict(new Date(lastMessage.sentAt), {
              locale: es,
            })}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {lastMessage.direction === "outbound" ? "Sent: " : ""}
          {lastMessage.body}
        </p>
      </div>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function groupByCustomer(messages: Message[]): ConversationPreview[] {
  const map = new Map<string, ConversationPreview>();
  for (const m of messages) {
    const existing = map.get(m.customerId);
    if (!existing) {
      map.set(m.customerId, {
        customerId: m.customerId,
        lastMessage: m,
        count: 1,
      });
      continue;
    }
    existing.count += 1;
    if (new Date(m.sentAt) > new Date(existing.lastMessage.sentAt)) {
      existing.lastMessage = m;
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.lastMessage.sentAt).getTime() -
      new Date(a.lastMessage.sentAt).getTime(),
  );
}
