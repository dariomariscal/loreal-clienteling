"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewHeader } from "../../../_components/view-header";
import { CustomerHeader } from "./customer-header";
import { NotesSection } from "./notes-section";
import {
  AIContextBlock,
  ActivityTimeline,
  NewAppointmentSheet,
  NextStepCard,
  PurchaseRow,
  type ActivityItem,
  type ActivityKind,
} from "@/components/ba";
import { Button } from "@/components/ui/button";
import { BackGlyph, MessageGlyph, MoreGlyph } from "@/components/ui/glyphs";
import {
  useCustomer,
  useCustomerActivity,
  useCustomerPurchases,
  useAppointments,
} from "@/lib/hooks";
import {
  useCustomerSummary,
  useRegenerateCustomerSummary,
  useDailyOpportunities,
} from "@/lib/hooks/use-ai";
import type { CustomerActivityType } from "@loreal/contracts";
import type { SessionUser } from "@/lib/auth";

interface CustomerProfileScreenProps {
  customerId: string;
  user: SessionUser;
}

// Ficha de clienta — la pantalla del producto.
//
// Mixed visual rhythm by design:
//   - Identity header:     plain, no chrome
//   - AI context block:    callout with border-left (voice, not feature)
//   - Next step:           the ONE accent card (visual star)
//   - Notes section:       plain text + eyebrow timestamps (Moleskine)
//   - Purchases:           list rows with thumbnails
//   - Activity timeline:   dot + connector line (chronology)
//   - Upcoming:            inset list
//
// Single-page scroll, no tabs. Per Endear/Attio modern customer profile
// design and the project's UX vision.
export function CustomerProfileScreen({
  customerId,
  user,
}: CustomerProfileScreenProps) {
  const router = useRouter();
  const customer = useCustomer(customerId);
  const summary = useCustomerSummary(customerId);
  const regenerate = useRegenerateCustomerSummary();
  const opportunities = useDailyOpportunities(undefined, 20);
  const purchases = useCustomerPurchases(customerId);
  const activity = useCustomerActivity(customerId);
  const upcoming = useAppointments(new Date().toISOString());

  const nextStep = React.useMemo(
    () => opportunities.data?.find((o) => o.customerId === customerId),
    [opportunities.data, customerId],
  );

  const upcomingForCustomer = (upcoming.data ?? []).filter(
    (a) => a.customerId === customerId,
  );

  const activityItems = mergeActivityEvents(activity.data?.pages ?? []);

  const [isNewApptOpen, setIsNewApptOpen] = React.useState(false);

  return (
    <>
      <ViewHeader
        title={
          customer.data ? (
            <span>
              {customer.data.firstName} {customer.data.lastName}
            </span>
          ) : (
            <span className="text-muted-foreground">Clienta</span>
          )
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.back()}
              aria-label="Volver"
            >
              <BackGlyph className="size-4" />
            </Button>
            <Link
              href={`/ba/customers/${customerId}/messages`}
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <MessageGlyph className="size-3.5" />
              Mensaje
            </Link>
            <Button variant="ghost" size="icon-sm" aria-label="Más">
              <MoreGlyph className="size-4" />
            </Button>
          </>
        }
      />

      <NewAppointmentSheet
        open={isNewApptOpen}
        onOpenChange={setIsNewApptOpen}
        baUserId={user.id}
        customerId={customerId}
      />

      <div className="px-8 pt-8 pb-20">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* ── Identity header — plain, no card ─────────────────────── */}
          <CustomerHeader customer={customer.data} isLoading={customer.isLoading} />

          {/* ── AI context block — callout with border-left ─────────── */}
          <AIContextBlock
            summary={summary.data?.summaryText}
            generatedAt={summary.data?.generatedAt}
            isLoading={summary.isLoading}
            isStreaming={regenerate.isPending}
            onRegenerate={() => regenerate.mutate(customerId)}
          />

          {/* ── Next step — the ONE accent card ──────────────────────── */}
          {nextStep ? (
            <NextStepCard
              title={nextStep.suggestedAction}
              rationale={nextStep.summary}
              actionLabel="Ver borrador"
              onAction={() => router.push(`/ba/customers/${customerId}/messages`)}
            />
          ) : null}

          {/* ── Notes — plain text with eyebrow timestamps ───────────── */}
          <Section label="Notas">
            <NotesSection customerId={customerId} actorUserId={user.id} />
          </Section>

          {/* ── Purchases — list rows ────────────────────────────────── */}
          <Section label="Compras">
            {purchases.isLoading ? (
              <ListSkeleton />
            ) : (purchases.data?.length ?? 0) === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Aún no hay compras registradas.
              </p>
            ) : (
              <ul className="divide-y divide-border/30">
                {purchases.data!.slice(0, 5).map((p) =>
                  (p.items ?? []).map((item) => (
                    <PurchaseRow
                      key={item.id}
                      productName={item.sku}
                      purchasedAt={p.purchasedAt}
                      amount={Number(item.unitPrice)}
                      quantity={item.quantity}
                    />
                  )),
                )}
              </ul>
            )}
          </Section>

          {/* ── Activity timeline — dot + connector line ─────────────── */}
          <Section label="Actividad">
            {activity.isLoading ? (
              <TimelineSkeleton />
            ) : (
              <ActivityTimeline items={activityItems.slice(0, 10)} />
            )}
          </Section>

          {/* ── Upcoming — inset list ────────────────────────────────── */}
          <Section
            label="Próximas"
            action={
              <button
                type="button"
                onClick={() => setIsNewApptOpen(true)}
                className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                + Agendar
              </button>
            }
          >
            {upcoming.isLoading ? (
              <ListSkeleton />
            ) : upcomingForCustomer.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Sin próximas citas. Cuando agendes una, aparecerá aquí.
              </p>
            ) : (
              <ul className="divide-y divide-border/40 rounded-lg border border-border/40 bg-card">
                {upcomingForCustomer.slice(0, 3).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3.5 px-4 py-3"
                  >
                    <span className="font-mono text-[13px] tabular-nums text-foreground">
                      {new Date(a.scheduledAt).toLocaleString("es-MX", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      · {a.durationMinutes} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

// ── Section shell — eyebrow header only, no chrome ──────────────────

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Skeletons ───────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <ul className="space-y-1" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-12 animate-pulse rounded bg-muted/40" />
      ))}
    </ul>
  );
}

function TimelineSkeleton() {
  return (
    <ol className="space-y-3" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex gap-3.5">
          <span className="size-[22px] shrink-0 animate-pulse rounded-full bg-muted/50" />
          <span className="h-5 flex-1 animate-pulse rounded bg-muted/40" />
        </li>
      ))}
    </ol>
  );
}

// ── Activity merging — flatten pages + map type → ActivityKind ──────

function mergeActivityEvents(pages: Array<{ events: unknown[] }>): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const page of pages) {
    for (const event of page.events as Array<{
      id: string;
      type: CustomerActivityType;
      occurredAt: string;
      title: string;
      body: string | null;
    }>) {
      out.push({
        id: event.id,
        kind: mapKind(event.type),
        title: event.title,
        description: event.body ?? undefined,
        at: event.occurredAt,
      });
    }
  }
  return out;
}

function mapKind(type: CustomerActivityType): ActivityKind {
  switch (type) {
    case "purchase":
      return "purchase";
    case "appointment":
      return "appointment";
    case "note":
      return "note";
    case "communication":
      return "message";
    case "recommendation":
    case "customer_registered":
      return "ai";
  }
}
