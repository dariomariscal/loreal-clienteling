"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import {
  channelLabel,
  formatMoney,
  lifecycleMeta,
} from "@/components/advisor/customer-vocabulary";
import { useCustomerMetrics } from "@/lib/hooks";
import {
  CustomerQuickActions,
  type CustomerQuickActionId,
} from "./customer-quick-actions";
import type { Customer } from "@/lib/hooks/use-customers";

interface Props {
  customer: Customer;
  onAction: (id: CustomerQuickActionId) => void;
}

/**
 * Always-visible identity column on the customer 360. Holds the hero portrait,
 * the LTV anchor, the lifecycle/loyalty badges and the editorial fact list
 * (language, contact preference, email, phone, birthday, member-since). The
 * quick-action row sits at the bottom so the advisor can always reach
 * Mensaje / Cita / Sugerir / Compra / Nota without scrolling the right pane.
 */
export function CustomerIdentityPanel({ customer, onAction }: Props) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const lifecycle = lifecycleMeta(customer.lifecycleStage);
  const since = format(new Date(customer.enrolledAt), "MMM yyyy", { locale: es });
  const { data: metrics } = useCustomerMetrics(customer.id);

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[color:var(--ba-sidebar)] text-[color:var(--ba-sidebar-foreground)]">
      <div className="shrink-0 flex flex-col items-center px-4 pt-7 text-center lg:px-6 lg:pt-10">
        <CustomerAvatar
          firstName={customer.firstName}
          lastName={customer.lastName}
          avatarUrl={customer.avatarUrl}
          size="xl"
          className="size-20 text-xl lg:size-28 lg:text-2xl"
        />
        <h1 className="mt-4 font-[var(--font-heading)] text-base tracking-tight lg:mt-5 lg:text-xl">
          {fullName}
        </h1>
        <p className="mt-1.5 font-[var(--font-heading)] text-xl text-[color:var(--ba-accent)] lg:mt-2 lg:text-2xl">
          {formatMoney(Number(customer.totalSpent))}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
          {customer.loyaltyTier ? (
            <Badge variant="outline" className="uppercase tracking-wider">
              {customer.loyaltyTier}
            </Badge>
          ) : null}
        </div>
      </div>

      <dl
        className="ba-identity-scroll mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6 text-left lg:mt-8 lg:space-y-6 lg:px-6"
        style={{
          scrollbarColor:
            "color-mix(in oklab, var(--ba-accent) 55%, transparent) transparent",
          scrollbarWidth: "thin",
        }}
      >
        <Field label="Idioma">
          {languageLabel(customer.preferredLanguage)}
        </Field>
        {customer.preferredChannel ? (
          <Field label="Contacto preferido">
            {channelLabel(customer.preferredChannel)}
          </Field>
        ) : null}
        {customer.email ? (
          <Field label="Email">
            <span className="block break-words text-[color:var(--ba-accent)]">
              {customer.email}
            </span>
          </Field>
        ) : null}
        {customer.phone ? <Field label="Teléfono">{customer.phone}</Field> : null}
        {customer.birthday ? (
          <Field label="Cumpleaños">
            {format(new Date(customer.birthday), "d 'de' MMMM, yyyy", {
              locale: es,
            })}
          </Field>
        ) : null}
        <Field label="Clienta desde">{since}</Field>
        {metrics?.lastVisitAt ? (
          <Field label="Última visita">
            {format(new Date(metrics.lastVisitAt), "d MMM yyyy", { locale: es })}
          </Field>
        ) : null}
      </dl>

      <div className="shrink-0 border-t border-[color:var(--ba-sidebar-border)] px-4 py-4">
        <CustomerQuickActions customer={customer} onAction={onAction} />
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-[0.18em] text-[color:var(--ba-sidebar-muted)] uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-[color:var(--ba-sidebar-foreground)]">
        {children}
      </dd>
    </div>
  );
}

function languageLabel(code: string): string {
  const map: Record<string, string> = {
    es: "Español",
    en: "English",
    "es-MX": "Español (MX)",
    "en-US": "English (US)",
  };
  return map[code] ?? code;
}
