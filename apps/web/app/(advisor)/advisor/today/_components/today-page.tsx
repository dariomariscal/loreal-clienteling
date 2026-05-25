"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUser } from "@clerk/nextjs";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { useAdvisorToday } from "@/lib/hooks/use-advisor";
import {
  AppointmentGlyph,
  FollowupBirthdayGlyph,
  FollowupCheckInGlyph,
  FollowupReplenishmentGlyph,
  RoutineMorningGlyph,
} from "@/components/ui/glyphs";

export function TodayPage() {
  const { user } = useUser();
  const { data, isLoading } = useAdvisorToday();
  const today = new Date();

  const greeting = greetFor(today);
  const firstName = user?.firstName ?? "";

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-10 py-10 lg:px-12">
        <header className="mb-10">
          <p className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(today, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </header>

        <div className="flex flex-col gap-6">
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
                      <Badge variant="outline" className="uppercase tracking-wider">
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
                  <li
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
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
                        Se unió el {format(new Date(c.enrolledAt), "d MMM", { locale: es })}
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
