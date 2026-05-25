"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { SectionCard } from "@/components/advisor/section-card";
import {
  useCustomerMessages,
  useCustomerSamples,
} from "@/lib/hooks/use-customer-detail";
import { useAppointments } from "@/lib/hooks/use-appointments";

interface Props {
  customerId: string;
}

export function ActiveContextSection({ customerId }: Props) {
  const samples = useCustomerSamples(customerId);
  const messages = useCustomerMessages(customerId);
  const now = new Date();
  const monthAhead = new Date();
  monthAhead.setMonth(monthAhead.getMonth() + 1);
  const appointments = useAppointments(now.toISOString(), monthAhead.toISOString());

  const upcomingAppointments =
    appointments.data?.filter(
      (a) => a.customerId === customerId && new Date(a.startTime) >= now,
    ) ?? [];
  const recentMessages = messages.data?.slice(0, 3) ?? [];
  const recentSamples = samples.data?.slice(0, 3) ?? [];

  const hasAny =
    upcomingAppointments.length > 0 ||
    recentMessages.length > 0 ||
    recentSamples.length > 0;

  return (
    <SectionCard title="Lo que está pasando">
      {!hasAny ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Por ahora no hay nada en curso con esta clienta.
        </p>
      ) : (
        <div className="flex flex-col gap-1 px-4 pt-2 pb-4">
          {upcomingAppointments.slice(0, 2).map((a) => (
            <Row
              key={a.id}
              label="Próxima cita"
              detail={`${format(new Date(a.startTime), "d MMM · HH:mm", { locale: es })} · ${a.durationMinutes} min`}
            />
          ))}
          {recentSamples.map((s) => (
            <Row
              key={s.id}
              label="Muestra entregada"
              detail={`hace ${formatDistanceToNowStrict(new Date(s.deliveredAt), { locale: es, addSuffix: false })}${s.isConverted ? " · se volvió compra" : ""}`}
            />
          ))}
          {recentMessages.map((m) => (
            <Row
              key={m.id}
              label={`${m.direction === "outbound" ? "Le escribiste" : "Te escribió"} · ${m.channel}`}
              detail={`hace ${formatDistanceToNowStrict(new Date(m.sentAt), { locale: es, addSuffix: false })} — ${truncate(m.body, 60)}`}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function Row({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-baseline gap-4 py-1.5">
      <span className="w-32 shrink-0 text-xs tracking-wide uppercase text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 truncate text-sm text-foreground">{detail}</span>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
