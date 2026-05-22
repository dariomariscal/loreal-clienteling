"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomer, useDeleteCustomerArco } from "@/lib/hooks";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CustomerProfileHeader } from "./customer-profile-header";
import { CustomerKpiCards } from "./customer-kpi-cards";
import {
  CustomerQuickActions,
  type QuickActionId,
} from "./customer-quick-actions";
import { BeautySection } from "./beauty/beauty-section";
import { PurchasesSection } from "./purchases-section";
import { RecommendationsSection } from "./recommendations-section";
import { AppointmentsSection } from "./appointments-section";
import { NotesSection } from "./notes-section";
import { NoteSheet } from "./note-sheet";
import { PurchaseSheet } from "./purchase/purchase-sheet";
import { AppointmentSheet } from "./appointment/appointment-sheet";
import { RecommendationSheet } from "./recommendation/recommendation-sheet";
import { MessageSheet } from "./message/message-sheet";
import { ActivityTimeline } from "./activity-timeline";

// ── Tab keys ───────────────────────────────────────────────────────
// Order matches the spec §3.4. Overview is the default landing tab; Notas
// is new in this refactor. Consentimientos and Seguimiento moved into the
// header "⋯ Acciones" menu (out of this surface).

const TABS = [
  { key: "overview", label: "Resumen" },
  { key: "belleza", label: "Belleza" },
  { key: "compras", label: "Compras" },
  { key: "recomendaciones", label: "Recomendaciones" },
  { key: "citas", label: "Citas" },
  { key: "notas", label: "Notas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const DEFAULT_TAB: TabKey = "overview";

function isTabKey(value: string | null): value is TabKey {
  return !!value && TABS.some((t) => t.key === value);
}

interface CustomerDetailPageProps {
  customerId: string;
  user: { id: string; role?: string | null };
}

export function CustomerDetailPage({
  customerId,
  user,
}: CustomerDetailPageProps) {
  const role = user.role ?? "ba";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: customer, isLoading } = useCustomer(customerId);

  // URL-synced active tab — shareable links + browser back/forward.
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

  // Local UI state — sheets opened from quick actions and the ARCO dialog
  // are coordinated here so siblings never need to talk to each other.
  const [openSheet, setOpenSheet] = React.useState<QuickActionId | null>(null);
  const [showArco, setShowArco] = React.useState(false);
  const deleteArco = useDeleteCustomerArco();

  // ── Loading / not-found ──────────────────────────────────────────

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 py-8">
        <p className="text-sm text-muted-foreground">Cliente no encontrado.</p>
      </div>
    );
  }

  function handleArcoDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const folio = formData.get("requestFolio") as string;
    deleteArco.mutate(
      { id: customerId, requestFolio: folio },
      {
        onSuccess: () => {
          setShowArco(false);
          router.push("/clientes");
        },
      },
    );
  }

  function handleQuickAction(id: QuickActionId) {
    setOpenSheet(id);
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 py-6">
      <CustomerProfileHeader
        customer={customer}
        onOpenActions={
          can(role, "customer.delete") ? () => setShowArco(true) : undefined
        }
      />

      <CustomerKpiCards
        customerId={customerId}
        onOpenAppointments={() => setActiveTab("citas")}
      />

      <CustomerQuickActions role={role} onAction={handleQuickAction} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
          <TabsIndicator />
        </TabsList>

        <TabsContent value="overview">
          <ActivityTimeline customerId={customerId} />
        </TabsContent>

        <TabsContent value="belleza">
          <BeautySection
            customerId={customerId}
            customerName={`${customer.firstName} ${customer.lastName}`}
            role={role}
          />
        </TabsContent>

        <TabsContent value="compras">
          <PurchasesSection
            customerId={customerId}
            onNewPurchase={
              can(role, "purchase.create")
                ? () => setOpenSheet("purchase")
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="recomendaciones">
          <RecommendationsSection
            customerId={customerId}
            onNewRecommendation={
              can(role, "recommendation.create")
                ? () => setOpenSheet("recommend")
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="citas">
          <AppointmentsSection
            customerId={customerId}
            onNewAppointment={
              can(role, "appointment.create")
                ? () => setOpenSheet("appointment")
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="notas">
          <NotesSection
            customerId={customerId}
            onNewNote={
              can(role, "note.create")
                ? () => setOpenSheet("note")
                : undefined
            }
          />
        </TabsContent>
      </Tabs>

      <NoteSheet
        open={openSheet === "note"}
        onOpenChange={(open) => !open && setOpenSheet(null)}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`}
      />

      <PurchaseSheet
        open={openSheet === "purchase"}
        onOpenChange={(open) => !open && setOpenSheet(null)}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`}
      />

      <AppointmentSheet
        open={openSheet === "appointment"}
        onOpenChange={(open) => !open && setOpenSheet(null)}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`}
        customerSegment={customer.lifecycleSegment}
        baUserId={user.id}
      />

      <RecommendationSheet
        open={openSheet === "recommend"}
        onOpenChange={(open) => !open && setOpenSheet(null)}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`}
      />

      <MessageSheet
        open={openSheet === "message"}
        onOpenChange={(open) => !open && setOpenSheet(null)}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`}
      />

      <Dialog
        open={showArco}
        onOpenChange={(open) => !open && setShowArco(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Derecho al olvido (ARCO)</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="mb-4 text-sm text-muted-foreground">
              Esta acción eliminará permanentemente todos los datos personales
              de{" "}
              <strong>
                {customer.firstName} {customer.lastName}
              </strong>
              . Las métricas agregadas se preservarán de forma anónima. Esta
              acción no se puede deshacer.
            </p>
            <form
              id="arco-form"
              onSubmit={handleArcoDelete}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="requestFolio">Folio de solicitud</Label>
                <Input
                  id="requestFolio"
                  name="requestFolio"
                  placeholder="ARCO-2026-0001"
                  required
                  disabled={deleteArco.isPending}
                />
              </div>
            </form>
          </DialogBody>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" disabled={deleteArco.isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="arco-form"
              variant="destructive"
              disabled={deleteArco.isPending}
            >
              {deleteArco.isPending ? "Eliminando..." : "Eliminar datos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 py-6">
      <div className="space-y-3">
        <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
        <div className="flex items-center gap-4">
          <div className="size-12 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-muted/30"
          />
        ))}
      </div>
      <div className="h-10 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
