"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useUser } from "@clerk/nextjs";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { Button } from "@/components/ui/button";
import { useShifts, type Shift, type ShiftStatus } from "@/lib/hooks/use-shifts";
import { useUsers } from "@/lib/hooks/use-users";
import { cn } from "@/lib/utils";
import { ShiftEditorSheet } from "./shift-editor-sheet";

interface SelectedCell {
  userId: string;
  userName: string;
  shiftDate: string;
  existing: Shift | null;
}

const STATUS_TONE: Record<ShiftStatus, string> = {
  scheduled: "bg-[color:var(--ba-accent-soft)] text-foreground border-[color:var(--ba-accent)]/30",
  active: "bg-success/10 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-border",
  off: "bg-muted text-muted-foreground border-border",
  vacation: "bg-[var(--color-warning,oklch(0.75_0.15_65))]/10 text-foreground border-border",
  sick: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_LABEL: Record<ShiftStatus, string> = {
  scheduled: "—",
  active: "Activa",
  completed: "Cerró",
  off: "Libre",
  vacation: "Vacac.",
  sick: "Enferm.",
};

export function CounterSchedulePage() {
  const { user } = useUser();
  const storeId = (user?.publicMetadata?.storeId as string | undefined) ?? "";

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const fromStr = format(weekDays[0], "yyyy-MM-dd");
  const toStr = format(weekDays[6], "yyyy-MM-dd");

  // BAs of the store — the rows of the calendar.
  const { data: usersResp, isLoading: usersLoading } = useUsers({
    storeId,
    role: "beauty_advisor",
    active: "true",
    limit: "50",
  });
  const bas = usersResp?.data ?? [];

  const { data: shifts, isLoading: shiftsLoading } = useShifts({
    storeId,
    from: fromStr,
    to: toStr,
  });

  const shiftIndex = useMemo(() => {
    const map = new Map<string, Shift>();
    for (const s of shifts ?? []) {
      map.set(`${s.userId}::${s.shiftDate}`, s);
    }
    return map;
  }, [shifts]);

  const loading = usersLoading || shiftsLoading;

  return (
    <>
      <SingleColumn>
        <div className="flex h-full w-full flex-col">
          <header className="border-b border-border bg-background px-6 py-5 lg:px-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-[var(--font-heading)] text-3xl tracking-tight text-foreground">
                  Turnos
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Semana del {format(weekDays[0], "d MMM", { locale: es })} al{" "}
                  {format(weekDays[6], "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart((d) => addDays(d, -7))}
                >
                  ← Semana anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
                  }
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart((d) => addDays(d, 7))}
                >
                  Semana siguiente →
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10">
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="sticky left-0 bg-muted/30 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        BA
                      </th>
                      {weekDays.map((day) => (
                        <th
                          key={day.toISOString()}
                          className="min-w-[110px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          <div className="capitalize">
                            {format(day, "EEE", { locale: es })}
                          </div>
                          <div className="mt-0.5 text-foreground tabular-nums">
                            {format(day, "d MMM", { locale: es })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-4 py-4">
                            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                          </td>
                          {weekDays.map((d) => (
                            <td key={d.toISOString()} className="px-3 py-4">
                              <div className="h-10 w-full animate-pulse rounded bg-muted" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : bas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          No hay BAs activas en este mostrador.
                        </td>
                      </tr>
                    ) : (
                      bas.map((ba) => (
                        <tr key={ba.id} className="border-b border-border last:border-b-0">
                          <td className="sticky left-0 bg-card px-4 py-3 text-left">
                            <p className="text-sm font-medium text-foreground">
                              {ba.fullName}
                            </p>
                            {ba.specialty ? (
                              <p className="text-xs text-muted-foreground capitalize">
                                {ba.specialty.replace("_", " ")}
                              </p>
                            ) : null}
                          </td>
                          {weekDays.map((day) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const shift = shiftIndex.get(
                              `${ba.id}::${dateStr}`,
                            );
                            return (
                              <td
                                key={dateStr}
                                className="px-2 py-2 align-top"
                              >
                                <ShiftCell
                                  shift={shift ?? null}
                                  onClick={() =>
                                    setSelected({
                                      userId: ba.id,
                                      userName: ba.fullName,
                                      shiftDate: dateStr,
                                      existing: shift ?? null,
                                    })
                                  }
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </SingleColumn>

      {selected ? (
        <ShiftEditorSheet
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          existing={selected.existing}
          userId={selected.userId}
          userName={selected.userName}
          storeId={storeId}
          shiftDate={selected.shiftDate}
        />
      ) : null}
    </>
  );
}

function ShiftCell({
  shift,
  onClick,
}: {
  shift: Shift | null;
  onClick: () => void;
}) {
  if (!shift) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-14 w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-[color:var(--ba-accent)] hover:bg-muted/30"
      >
        +
      </button>
    );
  }

  const hasHours = shift.startTime && shift.endTime;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14 w-full flex-col items-center justify-center rounded-md border px-1 text-xs transition-colors",
        STATUS_TONE[shift.status],
        "hover:brightness-95",
      )}
    >
      {hasHours ? (
        <span className="font-mono tabular-nums font-medium">
          {format(new Date(shift.startTime!), "HH:mm")}–
          {format(new Date(shift.endTime!), "HH:mm")}
        </span>
      ) : (
        <span className="font-medium">{STATUS_LABEL[shift.status]}</span>
      )}
    </button>
  );
}
