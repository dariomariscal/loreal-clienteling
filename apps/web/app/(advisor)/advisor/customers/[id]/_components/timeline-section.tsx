"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SectionCard } from "@/components/advisor/section-card";
import {
  AppointmentGlyph,
  MessageGlyph,
  NoteGlyph,
  PurchaseGlyph,
  RecommendGlyph,
  UserPlusGlyph,
  VisitGlyph,
} from "@/components/ui/glyphs";
import { useCustomerActivity } from "@/lib/hooks/use-customer-profile";
import type {
  CustomerActivityEvent,
  CustomerActivityType,
} from "@loreal/contracts";

interface Props {
  customerId: string;
}

const ICON: Record<CustomerActivityType, typeof NoteGlyph> = {
  customer_registered: UserPlusGlyph,
  order: PurchaseGlyph,
  recommendation: RecommendGlyph,
  appointment: AppointmentGlyph,
  visit: VisitGlyph,
  message: MessageGlyph,
  note: NoteGlyph,
};

export function TimelineSection({ customerId }: Props) {
  const { data, isLoading } = useCustomerActivity(customerId, 15);

  const events: CustomerActivityEvent[] =
    data?.pages.flatMap((p) => p.events) ?? [];

  return (
    <SectionCard title="Historia con la clienta">
      {isLoading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
      ) : events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Aún no hay actividad registrada.
        </p>
      ) : (
        <ol className="relative px-4 pt-2 pb-4">
          {events.map((ev, i) => {
            const Icon = ICON[ev.type] ?? NoteGlyph;
            const isLast = i === events.length - 1;
            return (
              <li key={ev.id} className="relative flex gap-4 pb-5">
                <div className="flex flex-col items-center">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]">
                    <Icon className="size-3.5" />
                  </span>
                  {!isLast ? (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {ev.title}
                  </p>
                  {ev.body ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {ev.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {format(new Date(ev.occurredAt), "d MMM yyyy · HH:mm", {
                      locale: es,
                    })}
                    {ev.actor.name ? ` · ${ev.actor.name}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
