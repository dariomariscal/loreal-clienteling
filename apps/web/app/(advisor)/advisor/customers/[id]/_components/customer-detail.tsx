"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCustomer } from "@/lib/hooks/use-customers";
import { CustomerDetailHeader } from "./customer-detail-header";
import { CustomerKpiCards } from "./customer-kpi-cards";
import {
  CustomerQuickActions,
  type CustomerQuickActionId,
} from "./customer-quick-actions";
import { ActiveContextSection } from "./active-context-section";
import { WishlistSection } from "./wishlist-section";
import { PurchaseHistorySection } from "./purchase-history-section";
import { TimelineSection } from "./timeline-section";
import { NotesSection } from "./notes-section";
import { CustomerCloset } from "./customer-closet";
// Reuse the dashboard surface 1:1 — both for the editorial beauty card
// (swatches, shade rows, preference chips) and for every create/edit sheet.
// Apple Mail / Notes / Linear all reach for the same form sheet from any
// surface, so the BA's mental model stays identical.
import { BeautySection } from "@/app/(dashboard)/clientes/[id]/_components/beauty/beauty-section";
import { NoteSheet } from "@/app/(dashboard)/clientes/[id]/_components/note-sheet";
import { OrderSheet } from "@/app/(dashboard)/clientes/[id]/_components/order/order-sheet";
import { AppointmentSheet } from "@/app/(dashboard)/clientes/[id]/_components/appointment/appointment-sheet";
import { RecommendationSheet } from "@/app/(dashboard)/clientes/[id]/_components/recommendation/recommendation-sheet";
import { MessageSheet } from "@/app/(dashboard)/clientes/[id]/_components/message/message-sheet";

interface Props {
  customerId: string;
  role: string;
  staffUserId: string;
}

const TABS = [
  { key: "overview", label: "Resumen" },
  { key: "belleza", label: "Belleza" },
  { key: "closet", label: "Lo que ha comprado" },
  { key: "wishlist", label: "Lista de deseos" },
  { key: "historia", label: "Historia" },
  { key: "notas", label: "Notas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
const DEFAULT_TAB: TabKey = "overview";

function isTabKey(value: string | null): value is TabKey {
  return !!value && TABS.some((t) => t.key === value);
}

/**
 * Customer detail orchestrator for the advisor surface. Three stacked zones:
 *
 *   1. Sticky hero header — name, lifecycle, tier, contact preference.
 *   2. KPI strip + quick-action row — the BA's anchor metrics + 1-tap reach.
 *   3. URL-synced tabs — content lives in single-responsibility sections so
 *      this file stays a thin composition root.
 *
 * Tab state syncs with `?tab=` so the back button works and a BA can paste a
 * deep link into a chat ("ábrele Belleza a María").
 */
export function CustomerDetail({ customerId, role, staffUserId }: Props) {
  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab: TabKey = React.useMemo(() => {
    const fromUrl = searchParams.get("tab");
    return isTabKey(fromUrl) ? fromUrl : DEFAULT_TAB;
  }, [searchParams]);

  const setActiveTab = React.useCallback(
    (next: string) => {
      if (!isTabKey(next)) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === DEFAULT_TAB) params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  // Single source of truth for which sheet is open. MessageSheet handles
  // WhatsApp / email / SMS through its own channel tabs.
  const [openSheet, setOpenSheet] =
    React.useState<CustomerQuickActionId | null>(null);

  const handleQuickAction = React.useCallback(
    (id: CustomerQuickActionId) => setOpenSheet(id),
    [],
  );

  const closeSheet = React.useCallback(() => setOpenSheet(null), []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Cargando clienta…
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No encontramos a esta clienta.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CustomerDetailHeader customer={customer} />

      <div className="flex-1 overflow-y-auto px-10 pt-8 pb-16 lg:px-14">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <CustomerKpiCards
            customerId={customerId}
            onOpenAppointments={() => setActiveTab("overview")}
          />
          <CustomerQuickActions
            customer={customer}
            onAction={handleQuickAction}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
              <TabsIndicator />
            </TabsList>

            <TabsContent value="overview" className="flex flex-col gap-6">
              <ActiveContextSection customerId={customerId} />
              <TimelineSection customerId={customerId} />
            </TabsContent>

            <TabsContent value="belleza">
              <BeautySection
                customerId={customerId}
                customerName={`${customer.firstName} ${customer.lastName}`.trim()}
                role={role}
              />
            </TabsContent>

            <TabsContent value="closet">
              <CustomerCloset customerId={customerId} />
            </TabsContent>

            <TabsContent value="wishlist" className="flex flex-col gap-6">
              <WishlistSection customerId={customerId} />
              <PurchaseHistorySection customerId={customerId} />
            </TabsContent>

            <TabsContent value="historia">
              <TimelineSection customerId={customerId} />
            </TabsContent>

            <TabsContent value="notas">
              <NotesSection customerId={customerId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sheets — reused 1:1 from the dashboard so create/edit feels
          identical across surfaces. */}
      <NoteSheet
        open={openSheet === "note"}
        onOpenChange={(open) => !open && closeSheet()}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`.trim()}
      />

      <OrderSheet
        open={openSheet === "purchase"}
        onOpenChange={(open) => !open && closeSheet()}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`.trim()}
      />

      <AppointmentSheet
        open={openSheet === "appointment"}
        onOpenChange={(open) => !open && closeSheet()}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`.trim()}
        customerLifecycleStage={customer.lifecycleStage}
        staffUserId={staffUserId}
      />

      <RecommendationSheet
        open={openSheet === "recommend"}
        onOpenChange={(open) => !open && closeSheet()}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`.trim()}
      />

      <MessageSheet
        open={openSheet === "message"}
        onOpenChange={(open) => !open && closeSheet()}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`.trim()}
      />
    </div>
  );
}
