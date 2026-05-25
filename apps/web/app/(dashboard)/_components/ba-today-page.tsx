"use client";

import * as React from "react";
import Link from "next/link";
import { useAdvisorToday } from "@/lib/hooks";
import type {
  TodayAppointment,
  TodayAtRiskCustomer,
  TodayBirthday,
  TodayNewCustomer,
  TodayPendingFollowup,
} from "@loreal/contracts";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  FollowupBirthdayGlyph,
  FollowupReplenishmentGlyph,
  FollowupSpecialEventGlyph,
  FollowupCheckInGlyph,
  FollowupGeneralGlyph,
} from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

type GlyphComponent = React.ComponentType<{ className?: string }>;

// ── BA "Today" — Tulip Advisor pattern ─────────────────────────────
// One-fetch home screen with 5 actionable buckets, not generic KPIs.
// Each section is a card with a small header, a list of up to 5 rows,
// and a "Ver todos" link to the full surface for that bucket.

interface BaTodayPageProps {
  user: {
    fullName?: string | null;
  };
}

export function BaTodayPage({ user }: BaTodayPageProps) {
  const { data, isLoading, isError, refetch } = useAdvisorToday();

  const firstName = user.fullName?.split(" ")[0] ?? "";
  const [greeting, setGreeting] = React.useState("");
  const [today, setToday] = React.useState("");
  React.useEffect(() => {
    setGreeting(getGreeting());
    setToday(
      new Date().toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header — editorial, lots of air */}
      <section className="space-y-1.5 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {today}
        </p>
        <h1 className="font-heading text-3xl tracking-tight text-foreground">
          {greeting}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Esto es lo que necesita tu atención hoy.
        </p>
      </section>

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">
            No se pudo cargar tu feed de hoy.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 text-[12px] text-destructive underline-offset-4 hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Strip of compact counters — at-a-glance only */}
      <Counters data={data} loading={isLoading} />

      {/* Two-column grid on desktop, stacked on mobile */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="Citas de hoy"
          count={data?.appointmentsToday.length}
          href="/agenda"
          loading={isLoading}
          emptyTitle="Sin citas para hoy"
          emptyDescription="Disfruta el ritmo, o agenda una desde el perfil de una clienta."
        >
          {(data?.appointmentsToday ?? []).slice(0, 5).map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))}
        </Section>

        <Section
          title="Cumpleaños esta semana"
          count={data?.upcomingBirthdays.length}
          href="/clientes?birthdayWithinDays=7"
          loading={isLoading}
          emptyTitle="Sin cumpleaños próximos"
          emptyDescription="Nadie cumple en los próximos 7 días."
        >
          {(data?.upcomingBirthdays ?? []).slice(0, 5).map((b) => (
            <BirthdayRow key={b.id} birthday={b} />
          ))}
        </Section>

        <Section
          title="En riesgo"
          count={data?.atRiskCustomers.length}
          href="/clientes?segment=at_risk"
          loading={isLoading}
          emptyTitle="Tu cartera está sana"
          emptyDescription="Ninguna clienta está marcada como en riesgo."
        >
          {(data?.atRiskCustomers ?? []).slice(0, 5).map((c) => (
            <AtRiskRow key={c.id} customer={c} />
          ))}
        </Section>

        <Section
          title="Nuevas esta semana"
          count={data?.newCustomersThisWeek.length}
          href="/clientes"
          loading={isLoading}
          emptyTitle="Sin clientas nuevas"
          emptyDescription="Aún no has registrado clientas esta semana."
        >
          {(data?.newCustomersThisWeek ?? []).slice(0, 5).map((c) => (
            <NewCustomerRow key={c.id} customer={c} />
          ))}
        </Section>
      </div>

      {(data?.pendingFollowups.length ?? 0) > 0 && (
        <Section
          title="Mensajes pendientes"
          count={data?.pendingFollowups.length}
          href="/mensajes"
          loading={isLoading}
          emptyTitle="Sin mensajes pendientes"
          emptyDescription="Estás al día con tus mensajes pendientes."
        >
          {(data?.pendingFollowups ?? []).slice(0, 5).map((f) => (
            <CampaignRow key={f.id} campaign={f} />
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Header counters ───────────────────────────────────────────────

function Counters({
  data,
  loading,
}: {
  data: ReturnType<typeof useAdvisorToday>["data"];
  loading: boolean;
}) {
  const items: { label: string; value: number | undefined; href: string }[] = [
    {
      label: "Citas hoy",
      value: data?.appointmentsToday.length,
      href: "/agenda",
    },
    {
      label: "Cumpleaños",
      value: data?.upcomingBirthdays.length,
      href: "/clientes?birthdayWithinDays=7",
    },
    {
      label: "En riesgo",
      value: data?.atRiskCustomers.length,
      href: "/clientes?segment=at_risk",
    },
    {
      label: "Nuevas",
      value: data?.newCustomersThisWeek.length,
      href: "/clientes",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "group/counter flex flex-col gap-0.5 rounded-2xl border border-border/40 bg-card px-4 py-3",
            "transition-colors duration-200 hover:border-foreground/30",
          )}
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </span>
          {loading ? (
            <span className="h-8 w-10 animate-pulse rounded-md bg-muted" />
          ) : (
            <span className="font-heading text-2xl tabular-nums text-foreground">
              {item.value ?? 0}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

// ── Section shell ─────────────────────────────────────────────────

interface SectionProps {
  title: string;
  count?: number;
  href: string;
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}

function Section({
  title,
  count,
  href,
  loading,
  emptyTitle,
  emptyDescription,
  children,
}: SectionProps) {
  const hasItems = React.Children.count(children) > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <header className="flex items-baseline justify-between gap-2 border-b border-border/30 px-5 py-3.5">
        <div className="flex items-baseline gap-2">
          <h2 className="font-heading text-[15px] tracking-tight text-foreground">
            {title}
          </h2>
          {!loading && count !== undefined && count > 0 && (
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        <Link
          href={href}
          className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todos →
        </Link>
      </header>

      {loading ? (
        <div className="space-y-1 p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/30"
            />
          ))}
        </div>
      ) : hasItems ? (
        <ul className="divide-y divide-border/30">{children}</ul>
      ) : (
        <div className="px-5 py-6 text-center">
          <p className="font-heading text-[14px] text-foreground">{emptyTitle}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {emptyDescription}
          </p>
        </div>
      )}
    </section>
  );
}

// ── Rows ──────────────────────────────────────────────────────────

function AppointmentRow({ appointment }: { appointment: TodayAppointment }) {
  const start = new Date(appointment.startTime);
  const end = new Date(
    start.getTime() + appointment.durationMinutes * 60_000,
  );
  const startLabel = start.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = end.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const accent = appointment.serviceTypeColor ?? "var(--accent)";

  return (
    <li>
      <Link
        href={`/clientes/${appointment.customerId}?tab=citas`}
        className="group/row flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
      >
        <span
          className="h-10 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
        <div className="w-16 shrink-0">
          <p className="font-heading text-sm tabular-nums text-foreground">
            {startLabel}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {endLabel}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {appointment.customerName}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {appointment.serviceTypeName ?? "Cita"}
            {appointment.isVirtual ? " · Virtual" : ""}
          </p>
        </div>
        {appointment.customerLifecycleStage === "vip" && (
          <Badge variant="success" size="sm">
            VIP
          </Badge>
        )}
      </Link>
    </li>
  );
}

function BirthdayRow({ birthday }: { birthday: TodayBirthday }) {
  const label = formatDaysUntil(birthday.daysUntil);
  return (
    <li>
      <Link
        href={`/clientes/${birthday.id}`}
        className="group/row flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
      >
        <Avatar name={`${birthday.firstName} ${birthday.lastName}`} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {birthday.firstName} {birthday.lastName}
          </p>
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <FollowupBirthdayGlyph className="size-3.5 shrink-0" />
            {label}
          </p>
        </div>
        {birthday.lifecycleStage === "vip" && (
          <Badge variant="success" size="sm">
            VIP
          </Badge>
        )}
      </Link>
    </li>
  );
}

function AtRiskRow({ customer }: { customer: TodayAtRiskCustomer }) {
  const days = customer.daysSinceLastOrder;
  return (
    <li>
      <Link
        href={`/clientes/${customer.id}`}
        className="group/row flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
      >
        <Avatar name={`${customer.firstName} ${customer.lastName}`} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {customer.firstName} {customer.lastName}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {days !== null
              ? `Sin compras hace ${days} días`
              : "Sin compras recientes"}
          </p>
        </div>
        <Badge variant="warning" size="sm">
          En riesgo
        </Badge>
      </Link>
    </li>
  );
}

function NewCustomerRow({ customer }: { customer: TodayNewCustomer }) {
  const since = new Date(customer.enrolledAt);
  return (
    <li>
      <Link
        href={`/clientes/${customer.id}`}
        className="group/row flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
      >
        <Avatar name={`${customer.firstName} ${customer.lastName}`} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {customer.firstName} {customer.lastName}
          </p>
          <p className="text-[12px] text-muted-foreground">
            Registrada{" "}
            {since.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        <Badge variant="info" size="sm">
          Nueva
        </Badge>
      </Link>
    </li>
  );
}

function CampaignRow({ campaign }: { campaign: TodayPendingFollowup }) {
  const Glyph = followupGlyph(campaign.campaignType);
  return (
    <li>
      <Link
        href={`/clientes/${campaign.customerId}?tab=overview`}
        className="group/row flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          <Glyph className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {campaign.customerName}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {campaign.body}
          </p>
        </div>
      </Link>
    </li>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatDaysUntil(days: number): string {
  if (days <= 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function followupGlyph(type: string | null): GlyphComponent {
  switch (type) {
    case "birthday":
      return FollowupBirthdayGlyph;
    case "replenishment":
      return FollowupReplenishmentGlyph;
    case "special_event":
      return FollowupSpecialEventGlyph;
    case "post_purchase":
    case "appointment_reminder":
      return FollowupCheckInGlyph;
    default:
      return FollowupGeneralGlyph;
  }
}
