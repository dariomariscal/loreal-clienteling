"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { useCreateMultiStoreEvent } from "@/lib/hooks/use-events";
import type { Store } from "@/lib/hooks/use-stores";
import { ApiError } from "@/lib/api-client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
}

const EVENT_KINDS = [
  { value: "masterclass", label: "Masterclass" },
  { value: "launch", label: "Lanzamiento" },
  { value: "vip_preview", label: "VIP preview" },
  { value: "trunk_show", label: "Trunk show" },
  { value: "discovery", label: "Discovery" },
] as const;

/**
 * Schedules the same event in N stores at once. Posts to /events/multi
 * which inserts one row per storeId with a shared eventGroupId so the
 * rollout shows as a single logical event in the area manager's list.
 */
export function MultiStoreEventSheet({ open, onOpenChange, stores }: Props) {
  const createMulti = useCreateMultiStoreEvent();

  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<(typeof EVENT_KINDS)[number]["value"]>(
    "masterclass",
  );
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("");

  const storeOptions = useMemo(
    () =>
      stores
        .filter((s) => s.isActive)
        .map((s) => ({ value: s.id, label: s.displayName })),
    [stores],
  );

  function reset() {
    setStoreIds([]);
    setName("");
    setDescription("");
    setKind("masterclass");
    setStartTime("");
    setEndTime("");
    setCapacity("");
  }

  const canSubmit =
    storeIds.length > 0 &&
    name.trim().length > 0 &&
    startTime.length > 0 &&
    endTime.length > 0 &&
    !createMulti.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      const result = await createMulti.mutateAsync({
        storeIds,
        name: name.trim(),
        description: description.trim() || undefined,
        kind,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        capacity: capacity ? Number(capacity) : undefined,
      });
      toast.success(
        `Evento programado en ${result.count} ${
          result.count === 1 ? "tienda" : "tiendas"
        }`,
      );
      reset();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? typeof err.body === "object" && err.body && "message" in err.body
            ? String((err.body as { message: unknown }).message)
            : err.statusText
          : "No se pudo crear el evento";
      toast.error(message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Programar evento multi-tienda</SheetTitle>
          <SheetDescription>
            Selecciona las tiendas y el sistema creará una entrada en cada una,
            compartiendo el mismo grupo de evento.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="event-stores">Tiendas</Label>
            <MultiSelect
              id="event-stores"
              options={storeOptions}
              value={storeIds}
              onChange={setStoreIds}
              placeholder="Selecciona una o varias tiendas"
              emptyMessage="No hay tiendas activas"
            />
            <p className="text-xs text-muted-foreground">
              {storeIds.length === 0
                ? "Selecciona al menos una tienda"
                : `${storeIds.length} ${
                    storeIds.length === 1 ? "tienda" : "tiendas"
                  } seleccionadas`}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-name">Nombre</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Lanzamiento Lancôme Génifique"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-kind">Tipo</Label>
            <select
              id="event-kind"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as (typeof EVENT_KINDS)[number]["value"])
              }
              className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm transition-colors hover:border-foreground/20 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            >
              {EVENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Inicio</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end">Fin</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-capacity">Cupo por tienda (opcional)</Label>
            <Input
              id="event-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Ej. 20"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description">Descripción (opcional)</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles del evento, requisitos, agenda…"
              rows={3}
              maxLength={2000}
            />
          </div>
        </SheetBody>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMulti.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createMulti.isPending
              ? "Programando…"
              : `Programar en ${storeIds.length || 0} ${
                  storeIds.length === 1 ? "tienda" : "tiendas"
                }`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
