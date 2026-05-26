"use client";

import { useState } from "react";
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
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { useUsers } from "@/lib/hooks/use-users";
import { useReassignCustomer } from "@/lib/hooks/use-customers";
import { cn } from "@/lib/utils";

interface ReassignCustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  /** Current assignee — excluded from the picker. */
  currentAssigneeId: string;
  /** Counter Manager's storeId — picker is scoped to BAs at the same store. */
  storeId: string;
}

/**
 * Reassign sheet — Counter Manager picks a BA from the same store and confirms.
 * Server-side validates that the target BA belongs to the customer's store.
 */
export function ReassignCustomerSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentAssigneeId,
  storeId,
}: ReassignCustomerSheetProps) {
  const [pickedUserId, setPickedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: usersResp, isLoading } = useUsers({
    storeId,
    role: "beauty_advisor",
    active: "true",
    limit: "50",
  });

  const reassign = useReassignCustomer();

  // Counter Manager can also reassign to herself or other counter managers.
  // For now we restrict to BAs which is the documented happy path.
  const candidates =
    usersResp?.data.filter((u) => u.id !== currentAssigneeId) ?? [];

  function handleSubmit() {
    if (!pickedUserId) return;
    reassign.mutate(
      { id: customerId, newAssignedToUserId: pickedUserId, reason: reason || undefined },
      {
        onSuccess: () => {
          const picked = candidates.find((c) => c.id === pickedUserId);
          toast.success(`${customerName} reasignada a ${picked?.fullName ?? "BA"}`);
          onOpenChange(false);
          setPickedUserId(null);
          setReason("");
        },
        onError: () =>
          toast.error("No se pudo reasignar. Intenta de nuevo."),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="default">
        <SheetHeader>
          <SheetTitle>Reasignar a otra BA</SheetTitle>
          <SheetDescription>
            {customerName} pasará a la nueva persona asignada y aparecerá en su
            cola.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Elegir BA
            </p>
            {isLoading ? (
              <div className="space-y-2 pt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 w-full animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <p className="pt-3 text-sm text-muted-foreground">
                No hay otras BAs en este mostrador.
              </p>
            ) : (
              <ul className="space-y-1 pt-2">
                {candidates.map((ba) => {
                  const picked = pickedUserId === ba.id;
                  return (
                    <li key={ba.id}>
                      <button
                        type="button"
                        onClick={() => setPickedUserId(ba.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                          picked
                            ? "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)]"
                            : "border-border hover:bg-muted/40",
                        )}
                      >
                        <CustomerAvatar firstName={ba.fullName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {ba.fullName}
                          </p>
                          {ba.specialty ? (
                            <p className="truncate text-xs text-muted-foreground capitalize">
                              {ba.specialty.replace("_", " ")}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="reassign-reason"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Motivo (opcional)
            </label>
            <textarea
              id="reassign-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Ej: Sofía es experta en fragancia y la clienta pregunta por perfume."
              className="min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60"
            />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={reassign.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!pickedUserId || reassign.isPending}
          >
            {reassign.isPending ? "Reasignando…" : "Confirmar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
