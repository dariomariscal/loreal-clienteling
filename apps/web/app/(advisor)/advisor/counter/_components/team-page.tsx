"use client";

import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { useTodayRoster } from "@/lib/hooks/use-shifts";
import { useCounterDashboardToday } from "@/lib/hooks/use-counter-dashboard";
import { TeamRosterList } from "./team-roster-list";
import { TeamRankingTable } from "./team-ranking-table";

export function CounterTeamPage() {
  const { data: roster, isLoading: rosterLoading } = useTodayRoster();
  const { data: dashboard, isLoading: dashboardLoading } =
    useCounterDashboardToday();

  const onShiftNow = roster?.filter((r) => r.isOnShiftNow).length ?? 0;

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
            Mi equipo
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {onShiftNow} en turno ahora · {roster?.length ?? 0} en el roster de hoy
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <SectionCard title="En turno hoy">
            <TeamRosterList roster={roster ?? []} loading={rosterLoading} />
          </SectionCard>

          <SectionCard title="Ranking del día">
            <TeamRankingTable
              ranking={dashboard?.team.ranking ?? []}
              loading={dashboardLoading}
            />
          </SectionCard>
        </div>
      </div>
    </SingleColumn>
  );
}
