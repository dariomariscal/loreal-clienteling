"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { SparkleDotGlyph } from "@/components/ui/glyphs";
import { useStoreSuggestedActions } from "@/lib/hooks/use-ai";
import type { StoreSuggestedAction } from "@/lib/hooks/use-ai";
import { ReassignCustomerSheet } from "./reassign-customer-sheet";

const TRIGGER_LABEL: Record<string, string> = {
  replenishment: "Reabastecer",
  life_event: "Evento personal",
  win_back: "Reactivar",
  birthday: "Cumpleaños",
  vip_cadence: "VIP",
  new_product_match: "Producto nuevo",
  abandoned_cart: "Carrito abierto",
  post_purchase: "Post-compra",
};

interface SelectedReassign {
  customerId: string;
  customerName: string;
  currentAssigneeId: string;
}

export function CounterQueuePage() {
  const { user } = useUser();
  const { data: queue, isLoading } = useStoreSuggestedActions();
  const [reassign, setReassign] = useState<SelectedReassign | null>(null);

  const storeId =
    (user?.publicMetadata?.storeId as string | undefined) ?? undefined;

  return (
    <>
      <SingleColumn>
        <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
          <header className="mb-8">
            <p className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
              Cola del mostrador
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Todas las acciones recomendadas del equipo para hoy. Reasigna o
              entra al perfil para actuar.
            </p>
          </header>

          <SectionCard title={`Pendientes (${queue?.length ?? 0})`}>
            <QueueList
              items={queue ?? []}
              loading={isLoading}
              onReassign={(item) =>
                setReassign({
                  customerId: item.customerId,
                  customerName: `${item.customer.firstName} ${item.customer.lastName}`,
                  currentAssigneeId: item.assignedToUserId,
                })
              }
            />
          </SectionCard>
        </div>
      </SingleColumn>

      {reassign && storeId ? (
        <ReassignCustomerSheet
          open={!!reassign}
          onOpenChange={(o) => !o && setReassign(null)}
          customerId={reassign.customerId}
          customerName={reassign.customerName}
          currentAssigneeId={reassign.currentAssigneeId}
          storeId={storeId}
        />
      ) : null}
    </>
  );
}

function QueueList({
  items,
  loading,
  onReassign,
}: {
  items: StoreSuggestedAction[];
  loading?: boolean;
  onReassign: (item: StoreSuggestedAction) => void;
}) {
  if (loading) {
    return (
      <ul className="divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <AdvisorEmptyState
        icon={<SparkleDotGlyph className="size-6" />}
        title="Cola vacía"
        description="No hay acciones recomendadas pendientes para el mostrador hoy."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <QueueRow key={item.id} item={item} onReassign={onReassign} />
      ))}
    </ul>
  );
}

function QueueRow({
  item,
  onReassign,
}: {
  item: StoreSuggestedAction;
  onReassign: (item: StoreSuggestedAction) => void;
}) {
  const customerName = `${item.customer.firstName} ${item.customer.lastName}`;
  const triggerLabel = TRIGGER_LABEL[item.triggerType] ?? item.triggerType;
  const lastSeen = item.customer.lastInteractionAt
    ? formatDistanceToNow(new Date(item.customer.lastInteractionAt), {
        addSuffix: true,
        locale: es,
      })
    : null;

  return (
    <li className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
      <Link
        href={`/advisor/customers/${item.customerId}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md hover:bg-muted/30"
      >
        <CustomerAvatar
          firstName={item.customer.firstName}
          lastName={item.customer.lastName}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {customerName}
            </p>
            {item.customer.loyaltyTier ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {item.customer.loyaltyTier}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span className="text-[color:var(--ba-accent)]">{triggerLabel}</span>
            {" · "}
            {item.recommendedAction}
            {lastSeen ? <span className="text-muted-foreground"> · vista {lastSeen}</span> : null}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2 self-end lg:self-auto">
        <Badge variant="outline" className="gap-1.5">
          <span
            aria-hidden
            className="inline-flex size-2 rounded-full bg-[color:var(--ba-accent)]"
          />
          {item.assignedTo.name ?? "—"}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReassign(item)}
          className="min-h-10"
        >
          Reasignar
        </Button>
      </div>
    </li>
  );
}
