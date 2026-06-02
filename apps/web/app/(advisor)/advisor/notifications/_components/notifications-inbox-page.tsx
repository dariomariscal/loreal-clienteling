"use client";

import * as React from "react";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BellGlyph } from "@/components/ui/glyphs";
import { NotificationRow } from "@/components/notifications/notification-row";
import {
  useDismissNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationListStatus,
} from "@/lib/hooks/use-notifications";

interface TabConfig {
  value: NotificationListStatus;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}

const TABS: ReadonlyArray<TabConfig> = [
  {
    value: "unread",
    label: "Sin leer",
    emptyTitle: "Bandeja al día",
    emptyDescription: "No tienes notificaciones sin leer.",
  },
  {
    value: "read",
    label: "Leídas",
    emptyTitle: "Aún nada por aquí",
    emptyDescription: "Las notificaciones que abras aparecerán en esta pestaña.",
  },
  {
    value: "dismissed",
    label: "Archivadas",
    emptyTitle: "Sin archivadas",
    emptyDescription: "Las notificaciones que descartes vivirán aquí.",
  },
];

export function NotificationsInboxPage() {
  const [tab, setTab] = React.useState<NotificationListStatus>("unread");
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-10 py-10 lg:px-12">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
              Notificaciones
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu bandeja de alertas en un solo lugar.
            </p>
          </div>
          {tab === "unread" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? "Marcando…" : "Marcar todas como leídas"}
            </Button>
          ) : null}
        </header>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as NotificationListStatus)}
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
            <TabsIndicator />
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <SectionCard title={t.label}>
                <NotificationsList tab={t} />
              </SectionCard>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </SingleColumn>
  );
}

function NotificationsList({ tab }: { tab: TabConfig }) {
  const { data, isLoading } = useNotifications({
    status: tab.value,
    limit: 50,
  });
  const markRead = useMarkNotificationRead();
  const dismiss = useDismissNotification();

  if (isLoading) return <InboxSkeleton />;

  const items = data ?? [];
  if (items.length === 0) {
    return (
      <AdvisorEmptyState
        icon={<BellGlyph className="size-6" />}
        title={tab.emptyTitle}
        description={tab.emptyDescription}
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((n) => (
        <li key={n.id}>
          <NotificationRow
            notification={n}
            showDismiss={tab.value !== "dismissed"}
            onClick={() => {
              if (n.readAt === null) markRead.mutate(n.id);
            }}
            onDismiss={() => dismiss.mutate(n.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function InboxSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
