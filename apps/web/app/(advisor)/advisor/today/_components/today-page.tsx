"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUser } from "@clerk/nextjs";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { AISparkleChip } from "@/components/advisor/ai/ai-sparkle-chip";
import { TriggerPill } from "@/components/advisor/ai/trigger-pill";
import { useAdvisorToday } from "@/lib/hooks/use-advisor";
import { useDailySuggestedActions } from "@/lib/hooks/use-ai";
import {
  AppointmentGlyph,
  FollowupBirthdayGlyph,
  FollowupCheckInGlyph,
  FollowupReplenishmentGlyph,
  PackageGlyph,
  ChevronRightGlyph,
} from "@/components/ui/glyphs";
import type {
  SuggestedActionTrigger,
  SuggestedActionWithCustomer,
} from "@loreal/contracts";

export function TodayPage() {
  const { user } = useUser();
  const { data, isLoading } = useAdvisorToday();
  const { data: suggestedActions = [] } = useDailySuggestedActions(undefined, 5);
  const today = new Date();

  const greeting = greetFor(today);
  const firstName = user?.firstName ?? "";
  const [topAction, ...restActions] = suggestedActions;

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-10 py-10 lg:px-12">
        <header className="mb-8">
          <p className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(today, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {topAction ? <BestPlayHero action={topAction} /> : null}

          {restActions.length > 0 ? (
            <SectionCard
              title="Sugerencias del día"
              action={<AISparkleChip size="sm" />}
            >
              <ul className="flex flex-col gap-1.5 px-2 pb-2">
                {restActions.map((action) => (
                  <SuggestedActionRow key={action.id} action={action} />
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard
            title={`Citas de hoy${
              data?.appointmentsToday.length
                ? ` (${data.appointmentsToday.length})`
                : ""
            }`}
          >
            {isLoading ? (
              <SectionSkeleton rows={3} />
            ) : data && data.appointmentsToday.length > 0 ? (
              <ul className="divide-y divide-border">
                {data.appointmentsToday.map((appt) => (
                  <li
                    key={appt.id}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <time className="w-16 shrink-0 font-mono text-sm tabular-nums text-foreground">
                      {format(new Date(appt.startTime), "HH:mm")}
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {appt.customerName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appt.serviceTypeName ?? "Servicio"} ·{" "}
                        {appt.durationMinutes} min
                        {appt.isVirtual ? " · virtual" : ""}
                      </p>
                    </div>
                    {appt.customerLifecycleStage === "vip" ? (
                      <Badge
                        variant="outline"
                        className="uppercase tracking-wider"
                      >
                        VIP
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <AdvisorEmptyState
                icon={<AppointmentGlyph className="size-6" />}
                title="Sin citas hoy"
                description="Tienes el día libre — un buen momento para dar seguimiento."
              />
            )}
          </SectionCard>

          <SectionCard title="Seguimientos prioritarios">
            {isLoading ? (
              <SectionSkeleton rows={3} />
            ) : data &&
              (data.upcomingBirthdays.length > 0 ||
                data.atRiskCustomers.length > 0 ||
                data.pendingFollowups.length > 0) ? (
              <ul className="divide-y divide-border">
                {data.upcomingBirthdays.slice(0, 3).map((c) => (
                  <FollowupRow
                    key={`bday-${c.id}`}
                    icon={<FollowupBirthdayGlyph className="size-4" />}
                    title={`${c.firstName} ${c.lastName}`}
                    hint={
                      c.daysUntil === 0
                        ? "Cumpleaños hoy"
                        : c.daysUntil === 1
                          ? "Cumpleaños mañana"
                          : `Cumpleaños en ${c.daysUntil} días`
                    }
                    customer={c}
                  />
                ))}
                {data.atRiskCustomers.slice(0, 3).map((c) => (
                  <FollowupRow
                    key={`risk-${c.id}`}
                    icon={<FollowupCheckInGlyph className="size-4" />}
                    title={`${c.firstName} ${c.lastName}`}
                    hint={
                      c.daysSinceLastOrder
                        ? `${c.daysSinceLastOrder} días desde la última compra`
                        : "Sin actividad reciente"
                    }
                    customer={c}
                  />
                ))}
                {data.pendingFollowups.slice(0, 3).map((f) => (
                  <FollowupRow
                    key={`fup-${f.id}`}
                    icon={<FollowupReplenishmentGlyph className="size-4" />}
                    title={f.customerName}
                    hint={f.campaignType ?? `vía ${f.channel}`}
                    customer={{
                      id: f.customerId,
                      firstName: f.customerName.split(" ")[0] ?? "",
                      lastName: f.customerName.split(" ").slice(1).join(" "),
                    }}
                  />
                ))}
              </ul>
            ) : (
              <AdvisorEmptyState
                icon={<FollowupCheckInGlyph className="size-6" />}
                title="Sin seguimientos pendientes"
              />
            )}
          </SectionCard>

          {data && data.newCustomersThisWeek.length > 0 ? (
            <SectionCard title="Nuevas esta semana">
              <ul className="divide-y divide-border">
                {data.newCustomersThisWeek.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <CustomerAvatar
                      firstName={c.firstName}
                      lastName={c.lastName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Se unió el{" "}
                        {format(new Date(c.enrolledAt), "d MMM", { locale: es })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </SingleColumn>
  );
}

/**
 * "Tu mejor jugada hoy" — the single most important suggested action,
 * laid out as a hero with the customer avatar on the left, the suggested
 * action and trigger pill in the middle and (when present) the product
 * preview anchored to the right. Tapping anywhere in the hero lands the BA
 * directly on the customer profile.
 */
function BestPlayHero({ action }: { action: SuggestedActionWithCustomer }) {
  const productImage = action.product?.images?.[0];
  return (
    <Link
      href={`/advisor/customers/${action.customerId}`}
      className="group block overflow-hidden rounded-2xl border border-[color:var(--ba-accent)]/25 bg-card transition-all duration-150 hover:border-foreground/15 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[color:var(--ba-accent-soft)]/30 px-5 py-2.5">
        <AISparkleChip label="Tu mejor jugada hoy" />
        <ChevronRightGlyph className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 sm:flex-1">
          <CustomerAvatar
            firstName={action.customer.firstName}
            lastName={action.customer.lastName}
            size="lg"
          />
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-heading)] text-lg tracking-tight text-foreground">
              {action.customer.firstName} {action.customer.lastName}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {action.description}
            </p>
            <div className="mt-2">
              <TriggerPill
                trigger={action.triggerType as SuggestedActionTrigger}
                size="sm"
              />
            </div>
          </div>
        </div>

        {action.product ? (
          <div className="flex items-center gap-3 border-t border-border pt-4 sm:w-56 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {productImage ? (
                <Image
                  src={productImage}
                  alt={action.product.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <PackageGlyph className="size-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              {action.product.brandName ? (
                <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  {action.product.brandName}
                </p>
              ) : null}
              <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                {action.product.title}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function SuggestedActionRow({
  action,
}: {
  action: SuggestedActionWithCustomer;
}) {
  const productImage = action.product?.images?.[0];
  return (
    <li>
      <Link
        href={`/advisor/customers/${action.customerId}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/40"
      >
        <TriggerPill
          trigger={action.triggerType as SuggestedActionTrigger}
          variant="icon"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {action.customer.firstName} {action.customer.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {action.description}
          </p>
        </div>
        {action.product ? (
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
            {productImage ? (
              <Image
                src={productImage}
                alt={action.product.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <PackageGlyph className="size-3.5" />
              </div>
            )}
          </div>
        ) : null}
      </Link>
    </li>
  );
}

function FollowupRow({
  icon,
  title,
  hint,
  customer,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  customer: { id: string; firstName: string; lastName?: string | null };
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <CustomerAvatar
        firstName={customer.firstName}
        lastName={customer.lastName}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <span className="text-[color:var(--ba-accent)]">{icon}</span>
          {hint}
        </p>
      </div>
    </li>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function greetFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
