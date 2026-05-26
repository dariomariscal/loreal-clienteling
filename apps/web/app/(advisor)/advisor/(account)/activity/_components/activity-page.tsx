"use client";

import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import type { SessionUser } from "@/lib/auth";
import type { AuditLog } from "@loreal/contracts";
import { useMyActivity } from "@/lib/hooks/use-users";
import { Button } from "@/components/ui/button";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { SectionCard } from "@/components/advisor/section-card";
import { ActivityGlyph } from "@/components/ui/glyphs";
import { AccountHeaderCard } from "../../_components/account-header-card";

const PAGE_SIZE = 25;

const ACTION_LABEL: Record<string, string> = {
  create: "Creaste",
  update: "Actualizaste",
  delete: "Eliminaste",
  restore: "Restauraste",
};

const ENTITY_LABEL: Record<string, string> = {
  note: "una nota",
  customer: "una clienta",
  appointment: "una cita",
  message: "un mensaje",
  order: "una compra",
  recommendation: "una recomendación",
  wishlist_item: "un artículo de la wishlist",
  beauty_profile: "un perfil de belleza",
  task: "una tarea",
  user: "un usuario",
};

interface Props {
  user: SessionUser;
}

/**
 * "/advisor/activity" — read-only log of everything the advisor has touched.
 * Useful for "what did I do yesterday?" and as a compliance artifact. The
 * page asks the API for one page at a time and reveals more on demand —
 * we don't preload everything because audit logs grow without bound.
 */
export function ActivityPage({ user }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useMyActivity(page, PAGE_SIZE);
  const items = data ?? [];
  const hasMore = items.length === PAGE_SIZE;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8 lg:px-10 lg:py-10">
      <AccountHeaderCard user={user} />

      <SectionCard title="Actividad reciente">
        {isLoading ? (
          <ActivitySkeleton />
        ) : items.length === 0 ? (
          <AdvisorEmptyState
            icon={<ActivityGlyph className="size-6" />}
            title="Aún no hay actividad"
            description="Todo lo que cambies por aquí aparecerá en esta lista."
          />
        ) : (
          <>
            <ol className="divide-y divide-border">
              {items.map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))}
            </ol>
            {(hasMore || page > 1) && (
              <div className="flex items-center justify-between gap-2 px-4 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">Página {page}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!hasMore || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}

function ActivityRow({ log }: { log: AuditLog }) {
  const date = new Date(log.timestamp);
  const action = ACTION_LABEL[log.action] ?? log.action;
  const entity = ENTITY_LABEL[log.entityType] ?? log.entityType;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-1 text-[color:var(--ba-accent)]">
        <ActivityGlyph className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">
          <span className="font-medium">{action}</span>{" "}
          <span className="text-muted-foreground">{entity}</span>{" "}
          <span className="font-mono text-xs text-muted-foreground/80">
            #{log.entityId.slice(0, 8)}
          </span>
        </p>
        <p
          className="text-xs text-muted-foreground"
          title={format(date, "PPpp", { locale: es })}
        >
          {formatDistanceToNowStrict(date, { locale: es, addSuffix: true })}
        </p>
      </div>
    </li>
  );
}

function ActivitySkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="mt-1 size-4 animate-pulse rounded bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
