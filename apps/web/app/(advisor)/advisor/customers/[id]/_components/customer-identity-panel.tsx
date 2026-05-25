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
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-[color:var(--ba-sidebar)] text-[color:var(--ba-sidebar-foreground)]">
      <div className="flex flex-col items-center px-6 pt-10 text-center">
        <CustomerAvatar
          firstName={customer.firstName}
          lastName={customer.lastName}
          avatarUrl={customer.avatarUrl}
          size="xl"
          className="size-28 text-2xl"
        />
        <h1 className="mt-5 font-[var(--font-heading)] text-xl tracking-tight">
          {fullName}
        </h1>
        <p className="mt-2 font-[var(--font-heading)] text-2xl text-[color:var(--ba-accent)]">
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

      <dl className="mt-8 flex-1 space-y-6 px-6 pb-6 text-left">
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
            <span className="text-[color:var(--ba-accent)]">{customer.email}</span>
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

      <div className="border-t border-[color:var(--ba-sidebar-border)] px-4 py-4">
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
