"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { useMessages } from "@/lib/hooks/use-messages";
import {
  useCustomerSearch,
  type CustomerListItem,
} from "@/lib/hooks/use-customers";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { MessageChannelIcon } from "@/components/advisor/message-channel-icon";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { Badge } from "@/components/ui/badge";
import { SearchGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/hooks/use-customer-detail";

interface Props {
  activeCustomerId?: string;
  /**
   * When provided, the search bar also surfaces clients from the BA's
   * cartera that don't have a thread yet, so they can start a new
   * conversation in-place. Without it, the search only filters existing
   * conversations.
   */
  staffUserId?: string;
}

interface ConversationPreview {
  customerId: string;
  lastMessage: Message;
  count: number;
}

export function ConversationList({ activeCustomerId, staffUserId }: Props) {
  const router = useRouter();
  const { data, isLoading } = useMessages();
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const conversations = React.useMemo(
    () => groupByCustomer(data ?? []),
    [data],
  );

  const isSearching = debounced.length >= 1;
  const lowered = debounced.toLowerCase();

  // Filter existing conversations by the name we joined from the
  // customers table (or by phone/email as a fallback for anonymized rows).
  const filteredConversations = React.useMemo(() => {
    if (!isSearching) return conversations;
    return conversations.filter((c) => {
      const m = c.lastMessage;
      const haystack = [
        m.customerFirstName,
        m.customerLastName,
        `${m.customerFirstName ?? ""} ${m.customerLastName ?? ""}`,
        m.toAddress,
        m.fromAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(lowered);
    });
  }, [conversations, isSearching, lowered]);

  // Pull cartera matches so the BA can start a brand-new thread without
  // leaving the inbox. We hide anyone who already has a thread (those
  // already show up under "Conversaciones" above).
  const customerSearch = useCustomerSearch(
    isSearching && staffUserId ? debounced : "",
  );
  const existingThreadIds = React.useMemo(
    () => new Set(conversations.map((c) => c.customerId)),
    [conversations],
  );
  const newContactCandidates = React.useMemo<CustomerListItem[]>(() => {
    if (!isSearching || !staffUserId) return [];
    return (customerSearch.data ?? []).filter(
      (c) =>
        c.assignedToUserId === staffUserId && !existingThreadIds.has(c.id),
    );
  }, [
    isSearching,
    staffUserId,
    customerSearch.data,
    existingThreadIds,
  ]);

  function handleStartNewThread(customer: CustomerListItem) {
    setQuery("");
    setDebounced("");
    router.push(`/advisor/messages/${customer.id}`);
  }

  const showEmpty =
    !isLoading &&
    filteredConversations.length === 0 &&
    newContactCandidates.length === 0;

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-3 border-b border-border px-4 py-4">
        <h2 className="font-[var(--font-heading)] text-base text-foreground">
          Bandeja
        </h2>
        <div className="relative">
          <SearchGlyph
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              staffUserId
                ? "Buscar o escribir a una clienta…"
                : "Buscar conversaciones…"
            }
            autoComplete="off"
            className={cn(
              "h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors",
              "placeholder:text-muted-foreground/60",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
            )}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : showEmpty ? (
          <AdvisorEmptyState
            title={
              isSearching ? "Sin coincidencias" : "Aún no hay conversaciones"
            }
            description={
              isSearching
                ? `Ninguna conversación o clienta de tu cartera coincide con "${debounced}".`
                : "Busca a una clienta arriba para empezar a escribir."
            }
          />
        ) : (
          <>
            {filteredConversations.length > 0 && (
              <ul className="divide-y divide-border">
                {filteredConversations.map((c) => (
                  <li key={c.customerId}>
                    <ConversationRow
                      conversation={c}
                      active={c.customerId === activeCustomerId}
                    />
                  </li>
                ))}
              </ul>
            )}

            {newContactCandidates.length > 0 && (
              <section>
                <header className="sticky top-0 z-10 border-y border-border/40 bg-muted/40 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
                  Iniciar nueva conversación
                </header>
                <ul className="divide-y divide-border">
                  {newContactCandidates.map((c) => (
                    <li key={c.id}>
                      <NewContactRow
                        customer={c}
                        onSelect={() => handleStartNewThread(c)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
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
  const firstName = lastMessage.customerFirstName ?? "";
  const lastName = lastMessage.customerLastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName =
    fullName ||
    lastMessage.toAddress ||
    lastMessage.fromAddress ||
    "Clienta";

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
        <CustomerAvatar
          firstName={firstName || displayName}
          lastName={lastName || null}
          avatarUrl={lastMessage.customerAvatarUrl ?? undefined}
          size="md"
        />
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-foreground text-background">
          <MessageChannelIcon channel={lastMessage.channel} className="size-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNowStrict(new Date(lastMessage.sentAt), {
              locale: es,
            })}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {lastMessage.direction === "outbound" ? "Enviado: " : ""}
          {lastMessage.body}
        </p>
      </div>
    </Link>
  );
}

function NewContactRow({
  customer,
  onSelect,
}: {
  customer: CustomerListItem;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 border-l-2 border-l-transparent px-4 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <CustomerAvatar
        firstName={customer.firstName}
        lastName={customer.lastName}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {customer.firstName} {customer.lastName}
          </p>
          {customer.lifecycleStage === "vip" && (
            <Badge variant="success" size="sm">
              VIP
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {customer.phone ?? customer.email ?? "Sin conversación previa"}
        </p>
      </div>
    </button>
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
