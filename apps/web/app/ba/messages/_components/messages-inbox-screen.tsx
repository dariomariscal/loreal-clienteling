"use client";

import * as React from "react";
import { ViewHeader } from "../../_components/view-header";
import {
  ConversationRow,
  DayGroupHeader,
  type CommunicationChannel,
} from "@/components/ba";
import { SearchGlyph } from "@/components/ui/glyphs";
import { useMessages, useCustomers } from "@/lib/hooks";
import type { Message } from "@/lib/hooks/use-customer-detail";
import type { SessionUser } from "@/lib/auth";
import { InboxFilterChips, type InboxFilter } from "./inbox-filter-chips";

interface MessagesInboxScreenProps {
  user: SessionUser;
}

interface Thread {
  customerId: string;
  customerName: string;
  isVip: boolean;
  channel: CommunicationChannel;
  preview: string;
  sentAt: string;
  unread: boolean;
  hasAiDraft: boolean;
}

// Pantalla de bandeja unificada. Single-column list, no preview pane —
// the BA opens a thread by tapping a row, which routes to the existing
// `/ba/customers/[id]/messages` screen. Keeping the bandeja flat avoids
// double-state (selected vs not) and matches the mobile-first reality
// of the iPad at the counter.
//
// Threads are derived client-side from the flat communications feed:
// group by customerId, keep the most recent message of each group, then
// fold in customer identity (name + VIP segment) from the customers
// endpoint. The shape leaves room for a future server-side endpoint
// without changing the row contract.
export function MessagesInboxScreen({ user: _user }: MessagesInboxScreenProps) {
  const messages = useMessages();
  const customers = useCustomers({ limit: "200" });
  const [filter, setFilter] = React.useState<InboxFilter>("all");
  const [query, setQuery] = React.useState("");

  const customerById = React.useMemo(() => {
    const map = new Map<string, { name: string; isVip: boolean }>();
    for (const c of customers.data?.data ?? []) {
      map.set(c.id, {
        name: `${c.firstName} ${c.lastName}`.trim(),
        isVip: c.lifecycleStage === "vip",
      });
    }
    return map;
  }, [customers.data]);

  const threads = React.useMemo<Thread[]>(
    () => collapseToThreads(messages.data ?? [], customerById),
    [messages.data, customerById],
  );

  const counts = React.useMemo(
    () => ({
      all: threads.length,
      unread: threads.filter((t) => t.unread).length,
      drafts: threads.filter((t) => t.hasAiDraft).length,
    }),
    [threads],
  );

  const filtered = React.useMemo(
    () => applyFilters(threads, filter, query),
    [threads, filter, query],
  );

  const grouped = React.useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <>
      <ViewHeader eyebrow={formatToday()} title="Mensajes" />

      <div className="px-8 pt-8 pb-16">
        <div className="mx-auto max-w-2xl">
          {/* Search input — borderless, inset, command-palette adjacent */}
          <label className="flex h-10 items-center gap-2 rounded-lg bg-muted/40 px-3 ring-1 ring-transparent transition-colors focus-within:ring-foreground/15">
            <SearchGlyph className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar clienta o mensaje"
              className="flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground/70 outline-none"
            />
          </label>

          {/* Filter chips — text labels, underline indicator */}
          <div className="mt-5 border-b border-border/40">
            <InboxFilterChips
              value={filter}
              onChange={setFilter}
              counts={counts}
            />
          </div>

          {/* List */}
          <div className="pt-4">
            {messages.isLoading || customers.isLoading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState filter={filter} hasQuery={query.length > 0} />
            ) : (
              <div>
                {grouped.map((group) => (
                  <section key={group.key}>
                    <DayGroupHeader label={group.label} />
                    <ul>
                      {group.items.map((t) => (
                        <li key={t.customerId}>
                          <ConversationRow
                            customerId={t.customerId}
                            customerName={t.customerName}
                            channel={t.channel}
                            preview={t.preview}
                            sentAt={t.sentAt}
                            unread={t.unread}
                            hasAiDraft={t.hasAiDraft}
                            isVip={t.isVip}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Empty / loading states ──────────────────────────────────────────

function EmptyState({
  filter,
  hasQuery,
}: {
  filter: InboxFilter;
  hasQuery: boolean;
}) {
  const copy = hasQuery
    ? {
        title: "Sin resultados.",
        body: "Prueba con otro nombre o palabra del mensaje.",
      }
    : filter === "unread"
      ? {
          title: "Estás al día.",
          body: "No hay mensajes sin leer.",
        }
      : filter === "drafts"
        ? {
            title: "No hay borradores listos.",
            body: "Cuando la IA prepare uno, aparecerá aquí.",
          }
        : {
            title: "Tu bandeja está tranquila.",
            body: "Cuando una clienta te escriba, aparecerá aquí.",
          };

  return (
    <div className="py-16 text-center">
      <p className="text-[14px] font-medium text-foreground" style={{ fontWeight: 540 }}>
        {copy.title}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{copy.body}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-px" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="h-[68px] animate-pulse rounded-md bg-muted/30" />
      ))}
    </ul>
  );
}

// ── Domain logic ────────────────────────────────────────────────────

function collapseToThreads(
  messages: Message[],
  customerById: Map<string, { name: string; isVip: boolean }>,
): Thread[] {
  const latestByCustomer = new Map<string, Message>();

  for (const m of messages) {
    const prev = latestByCustomer.get(m.customerId);
    if (!prev || m.sentAt > prev.sentAt) {
      latestByCustomer.set(m.customerId, m);
    }
  }

  const threads: Thread[] = [];
  for (const m of latestByCustomer.values()) {
    const customer = customerById.get(m.customerId);
    const name = customer?.name ?? "Clienta";
    threads.push({
      customerId: m.customerId,
      customerName: name,
      isVip: customer?.isVip ?? false,
      channel: m.channel,
      preview: m.body,
      sentAt: m.sentAt,
      // Unread is "inbound from the customer that we haven't read yet" —
      // the readAt timestamp is set by the BA reading the message in the
      // detail screen. Outbound messages from the BA never count as unread.
      unread: m.direction === "inbound" && !m.readAt,
      // Placeholder until the AI-draft persistence lands: we mark the
      // queued/draft followups as "hasAiDraft". Once the server exposes a
      // dedicated "draft pending" flag, swap this single line.
      hasAiDraft: m.status === "queued" && m.direction === "outbound",
    });
  }

  return threads.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

function applyFilters(
  threads: Thread[],
  filter: InboxFilter,
  query: string,
): Thread[] {
  const q = query.trim().toLowerCase();
  return threads.filter((t) => {
    if (filter === "unread" && !t.unread) return false;
    if (filter === "drafts" && !t.hasAiDraft) return false;
    if (q.length > 0) {
      const hay =
        `${t.customerName} ${t.preview}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Grouping ────────────────────────────────────────────────────────

interface DayGroup {
  key: string;
  label: string;
  items: Thread[];
}

function groupByDay(threads: Thread[]): DayGroup[] {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

  const buckets: Record<string, DayGroup> = {
    today: { key: "today", label: "Hoy", items: [] },
    yesterday: { key: "yesterday", label: "Ayer", items: [] },
    week: { key: "week", label: "Esta semana", items: [] },
    earlier: { key: "earlier", label: "Anterior", items: [] },
  };

  for (const t of threads) {
    const d = new Date(t.sentAt);
    if (d >= today) buckets.today.items.push(t);
    else if (d >= yesterday) buckets.yesterday.items.push(t);
    else if (d >= weekAgo) buckets.week.items.push(t);
    else buckets.earlier.items.push(t);
  }

  return Object.values(buckets).filter((g) => g.items.length > 0);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatToday(): string {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
