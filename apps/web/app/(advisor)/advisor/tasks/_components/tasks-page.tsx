"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { SectionCard } from "@/components/advisor/section-card";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import {
  useCompleteTask,
  useDismissTask,
  useTasks,
} from "@/lib/hooks/use-tasks";
import {
  CheckGlyph,
  CloseGlyph,
  FollowupBirthdayGlyph,
  FollowupCheckInGlyph,
  FollowupReplenishmentGlyph,
  FollowupSpecialEventGlyph,
} from "@/components/ui/glyphs";

const TRIGGER_ICON: Record<string, typeof FollowupCheckInGlyph> = {
  birthday: FollowupBirthdayGlyph,
  replenishment: FollowupReplenishmentGlyph,
  special_event: FollowupSpecialEventGlyph,
  check_in: FollowupCheckInGlyph,
};

export function TasksPage() {
  const { data, isLoading } = useTasks({ status: "pending" });
  const complete = useCompleteTask();
  const dismiss = useDismissTask();

  return (
    <SingleColumn>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-10 py-10 lg:px-12">
        <header className="mb-10">
          <h1 className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow-ups, birthdays and replenishments
          </p>
        </header>

        <SectionCard title="Pending">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : !data || data.length === 0 ? (
            <AdvisorEmptyState
              icon={<CheckGlyph className="size-6" />}
              title="All caught up"
              description="No pending tasks right now."
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.map((task) => {
                const Icon =
                  TRIGGER_ICON[task.triggerType] ?? FollowupCheckInGlyph;
                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-4 px-4 py-4"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/advisor/customers/${task.customerId}`}
                          className="truncate text-sm font-medium text-foreground hover:underline"
                        >
                          {task.customerFirstName} {task.customerLastName}
                        </Link>
                        {task.customerTier ? (
                          <Badge variant="outline" size="sm" className="uppercase tracking-wider">
                            {task.customerTier}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-foreground">
                        {task.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {task.recommendedAction} ·{" "}
                        {format(new Date(task.dueDate), "d MMM", { locale: es })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => complete.mutate(task.id)}
                        disabled={complete.isPending}
                        aria-label="Mark as done"
                      >
                        <CheckGlyph className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => dismiss.mutate(task.id)}
                        disabled={dismiss.isPending}
                        aria-label="Dismiss"
                      >
                        <CloseGlyph className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </SingleColumn>
  );
}
