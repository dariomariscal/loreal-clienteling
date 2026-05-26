"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  type Shift,
  type ShiftStatus,
} from "@/lib/hooks/use-shifts";
import { cn } from "@/lib/utils";

interface ShiftEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing shift for the cell — null when creating a new one. */
  existing: Shift | null;
  userId: string;
  userName: string;
  storeId: string;
  /** YYYY-MM-DD for the day this cell represents. */
  shiftDate: string;
}

const STATUS_OPTIONS: { value: ShiftStatus; label: string }[] = [
  { value: "scheduled", label: "Programada" },
  { value: "off", label: "Día libre" },
  { value: "vacation", label: "Vacaciones" },
  { value: "sick", label: "Enfermedad" },
];

const DEFAULT_START = "11:00";
const DEFAULT_END = "20:00";

/**
 * Sheet to create / edit / delete a single shift cell. Times are entered as
 * HH:mm in local time and converted to ISO when persisting.
 */
export function ShiftEditorSheet({
  open,
  onOpenChange,
  existing,
  userId,
  userName,
  storeId,
  shiftDate,
}: ShiftEditorSheetProps) {
  const [status, setStatus] = useState<ShiftStatus>(
    existing?.status ?? "scheduled",
  );
  const [startTime, setStartTime] = useState<string>(
    existing?.startTime
      ? toLocalHHmm(existing.startTime)
      : DEFAULT_START,
  );
  const [endTime, setEndTime] = useState<string>(
    existing?.endTime ? toLocalHHmm(existing.endTime) : DEFAULT_END,
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  // Reset state when the target cell changes.
  useEffect(() => {
    setStatus(existing?.status ?? "scheduled");
    setStartTime(
      existing?.startTime ? toLocalHHmm(existing.startTime) : DEFAULT_START,
    );
    setEndTime(
      existing?.endTime ? toLocalHHmm(existing.endTime) : DEFAULT_END,
    );
    setNotes(existing?.notes ?? "");
  }, [existing?.id, existing?.status, existing?.startTime, existing?.endTime, existing?.notes]);

  const create = useCreateShift();
  const update = useUpdateShift();
  const remove = useDeleteShift();
  const pending = create.isPending || update.isPending || remove.isPending;

  const needsHours = status === "scheduled";

  function handleSave() {
    const payload = {
      status,
      ...(needsHours
        ? {
            startTime: toIso(shiftDate, startTime),
            endTime: toIso(shiftDate, endTime),
          }
        : { startTime: undefined, endTime: undefined }),
      notes: notes || undefined,
    };

    if (existing) {
      update.mutate(
        { id: existing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Turno actualizado");
            onOpenChange(false);
          },
          onError: () => toast.error("No se pudo actualizar"),
        },
      );
    } else {
      create.mutate(
        {
          userId,
          storeId,
          shiftDate,
          ...payload,
        },
        {
          onSuccess: () => {
            toast.success("Turno creado");
            onOpenChange(false);
          },
          onError: () => toast.error("No se pudo crear"),
        },
      );
    }
  }

  function handleDelete() {
    if (!existing) return;
    remove.mutate(existing.id, {
      onSuccess: () => {
        toast.success("Turno eliminado");
        onOpenChange(false);
      },
      onError: () => toast.error("No se pudo eliminar"),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="default">
        <SheetHeader>
          <SheetTitle>
            {existing ? "Editar turno" : "Nuevo turno"}
          </SheetTitle>
          <SheetDescription>
            {userName} · {shiftDate}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    status === opt.value
                      ? "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)] text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {needsHours ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="shift-start"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Entrada
                </label>
                <input
                  id="shift-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                />
              </div>
              <div>
                <label
                  htmlFor="shift-end"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Salida
                </label>
                <input
                  id="shift-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="shift-notes"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Notas (opcional)
            </label>
            <textarea
              id="shift-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="mt-2 min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
            />
          </div>
        </SheetBody>
        <SheetFooter>
          {existing ? (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={pending}
              className="mr-auto text-destructive hover:bg-destructive/10"
            >
              Eliminar
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function toLocalHHmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toIso(dateStr: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const [y, mo, d] = dateStr.split("-").map((s) => parseInt(s, 10));
  const local = new Date(y, mo - 1, d, h, m);
  return local.toISOString();
}
