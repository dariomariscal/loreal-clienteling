"use client";

import { useAdvisorToday } from "@/lib/hooks/use-advisor";
import { useTaskCounts } from "@/lib/hooks/use-tasks";
import { SectionCard } from "@/components/advisor/section-card";
import {
  AppointmentGlyph,
  CheckGlyph,
  MessageGlyph,
  UserGlyph,
} from "@/components/ui/glyphs";

type GlyphComponent = typeof UserGlyph;

interface Stat {
  label: string;
  value: number | string;
  icon: GlyphComponent;
  hint?: string;
}

/**
 * At-a-glance personal stats. Pulls from the same hooks the "Today" feed
 * uses so a single API call serves both screens — no new endpoint needed
 * for the MVP. Numbers are intentionally low-fi (counts, not deltas) until
 * we wire dedicated weekly metrics.
 */
export function WeeklySummaryCard() {
  const { data: today, isLoading: loadingToday } = useAdvisorToday();
  const { data: counts, isLoading: loadingCounts } = useTaskCounts();

  const loading = loadingToday || loadingCounts;

  const stats: Stat[] = [
    {
      label: "Citas de hoy",
      value: today?.appointmentsToday.length ?? 0,
      icon: AppointmentGlyph,
    },
    {
      label: "Clientas nuevas esta semana",
      value: today?.newCustomersThisWeek.length ?? 0,
      icon: UserGlyph,
    },
    {
      label: "Seguimientos pendientes",
      value: today?.pendingFollowups.length ?? 0,
      icon: MessageGlyph,
    },
    {
      label: "Tareas abiertas",
      value: counts?.pending ?? 0,
      icon: CheckGlyph,
    },
  ];

  return (
    <SectionCard title="De un vistazo">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <li
              key={s.label}
              className="flex flex-col gap-2 bg-card px-4 py-4"
            >
              <span className="text-[color:var(--ba-accent)]">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="font-[var(--font-heading)] text-2xl tabular-nums text-foreground">
                {loading ? "—" : s.value}
              </span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
