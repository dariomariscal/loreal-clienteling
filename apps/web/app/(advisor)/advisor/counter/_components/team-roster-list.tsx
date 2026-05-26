"use client";

import { format } from "date-fns";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { UserGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import type { ShiftRosterEntry } from "@/lib/hooks/use-shifts";

interface TeamRosterListProps {
  roster: ShiftRosterEntry[];
  loading?: boolean;
}

const SPECIALTY_LABEL: Record<string, string> = {
  generalist: "Generalista",
  makeup_artist: "MUA",
  skincare_expert: "Skincare",
  fragrance_specialist: "Fragancia",
};

const STATUS_LABEL: Record<ShiftRosterEntry["status"], string> = {
  scheduled: "Programada",
  active: "En turno",
  completed: "Terminó",
  off: "Día libre",
  vacation: "Vacaciones",
  sick: "Enfermedad",
};

export function TeamRosterList({ roster, loading }: TeamRosterListProps) {
  if (loading) {
    return (
      <ul className="divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (roster.length === 0) {
    return (
      <AdvisorEmptyState
        icon={<UserGlyph className="size-6" />}
        title="Sin equipo en el roster de hoy"
        description="Asigna turnos en la sección de Turnos."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {roster.map((entry) => (
        <li key={entry.shiftId} className="flex items-center gap-3 px-4 py-3">
          <div className="relative">
            <CustomerAvatar
              firstName={entry.fullName ?? "—"}
              size="md"
            />
            {/* Status dot — Slack/Linear pattern */}
            <span
              aria-hidden
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card",
                entry.isOnShiftNow ? "bg-success" : "bg-muted-foreground/40",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {entry.fullName ?? "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {entry.specialty
                ? SPECIALTY_LABEL[entry.specialty] ?? entry.specialty
                : "BA"}
              {entry.startTime && entry.endTime ? (
                <>
                  {" "}
                  · {format(new Date(entry.startTime), "HH:mm")}–
                  {format(new Date(entry.endTime), "HH:mm")}
                </>
              ) : null}
            </p>
          </div>
          <Badge
            variant={entry.isOnShiftNow ? "default" : "outline"}
            className="shrink-0 uppercase tracking-wider"
          >
            {STATUS_LABEL[entry.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
