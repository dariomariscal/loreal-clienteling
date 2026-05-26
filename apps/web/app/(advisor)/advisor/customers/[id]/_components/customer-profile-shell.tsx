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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdvisorNav } from "@/app/(advisor)/_components/advisor-nav";
import { useCustomer } from "@/lib/hooks/use-customers";
import { ProfileTopBar } from "./profile-top-bar";
import { CustomerIdentityPanel } from "./customer-identity-panel";
import { CustomerKpiCards } from "./customer-kpi-cards";
import { ActiveContextSection } from "./active-context-section";
import { WishlistSection } from "./wishlist-section";
import { PurchaseHistorySection } from "./purchase-history-section";
import { TimelineSection } from "./timeline-section";
import { NotesSection } from "./notes-section";
import { CustomerCloset } from "./customer-closet";
import type { CustomerQuickActionId } from "./customer-quick-actions";
import { BeautySection } from "@/app/(dashboard)/clientes/[id]/_components/beauty/beauty-section";
import { NoteSheet } from "@/app/(dashboard)/clientes/[id]/_components/note-sheet";
import { OrderSheet } from "@/app/(dashboard)/clientes/[id]/_components/order/order-sheet";
import { AppointmentSheet } from "@/components/appointment/appointment-sheet";
import { RecommendationSheet } from "@/app/(dashboard)/clientes/[id]/_components/recommendation/recommendation-sheet";
import { MessageSheet } from "@/app/(dashboard)/clientes/[id]/_components/message/message-sheet";
import type { SessionUser } from "@/lib/auth";

interface Props {
  customerId: string;
  user: SessionUser;
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
 * Full-screen anatomy of the customer 360. Top bar spans the full width with
 * the hamburger that opens the global nav + customer list as a drawer. Below
 * it, a two-column layout: a permanent 340px identity panel on the left
 * (portrait, LTV, fact list, quick actions) and the tabbed content surface
 * on the right.
 */
export function CustomerProfileShell({ customerId, user }: Props) {
  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [openSheet, setOpenSheet] =
    React.useState<CustomerQuickActionId | null>(null);

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

  const handleQuickAction = React.useCallback(
    (id: CustomerQuickActionId) => setOpenSheet(id),
    [],
  );
  const closeSheet = React.useCallback(() => setOpenSheet(null), []);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ProfileTopBar
        user={user}
        onOpenMenu={() => setMenuOpen(true)}
        menuOpen={menuOpen}
      />

      {isLoading ? (
        <ShellState>Cargando clienta…</ShellState>
      ) : isError || !customer ? (
        <ShellState>No encontramos a esta clienta.</ShellState>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
          <CustomerIdentityPanel
            customer={customer}
            onAction={handleQuickAction}
          />

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="@container flex h-full min-w-0 min-h-0 flex-col gap-0 bg-[color:var(--ba-surface)]"
          >
            <div className="relative min-w-0 shrink-0 border-b border-border bg-background">
              <TabsList className="border-b-0 px-4 lg:px-10">
                {TABS.map((t) => (
                  <TabsTrigger key={t.key} value={t.key}>
                    {t.label}
                  </TabsTrigger>
                ))}
                <TabsIndicator />
              </TabsList>
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 right-0 h-full w-6 bg-gradient-to-l from-background to-transparent lg:hidden"
              />
            </div>

            <div className="min-w-0 min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-10 lg:py-8">
              <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6">
                <TabsContent value="overview" className="flex flex-col gap-6">
                  <CustomerKpiCards customerId={customerId} />
                  <ActiveContextSection customerId={customerId} />
                  <TimelineSection customerId={customerId} />
                </TabsContent>

                <TabsContent value="belleza">
                  <BeautySection
                    customerId={customerId}
                    customerName={`${customer.firstName} ${customer.lastName}`.trim()}
                    role={user.role}
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
                  <NotesSection
                    customerId={customerId}
                    onAddNote={() => handleQuickAction("note")}
                  />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      )}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          id="advisor-menu"
          side="left"
          size="sm"
          showCloseButton={false}
          className="flex flex-col gap-0 bg-[color:var(--ba-sidebar)] p-0"
        >
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SheetDescription className="sr-only">
            Navegación principal del asesor.
          </SheetDescription>
          <AdvisorNav user={user} onNavigate={closeMenu} />
        </SheetContent>
      </Sheet>

      {customer ? (
        <>
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
            staffUserId={user.id}
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
        </>
      ) : null}
    </div>
  );
}

function ShellState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
