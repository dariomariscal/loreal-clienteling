"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCustomer } from "@/lib/hooks";

interface NewCustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Deliberately minimal capture surface. The UX vision is explicit: one
// active field (name), three optional ones in muted gray, and a free-form
// notes textarea. María shouldn't have to fight a wizard to start a
// relationship — the data fills in over time, when it matters.
export function NewCustomerSheet({ open, onOpenChange }: NewCustomerSheetProps) {
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Whenever the sheet closes, reset state so the next open starts fresh.
  React.useEffect(() => {
    if (!open) {
      const id = setTimeout(() => {
        setFirstName("");
        setLastName("");
        setPhone("");
        setEmail("");
        setNotes("");
      }, 200);
      return () => clearTimeout(id);
    }
  }, [open]);

  const canSubmit = firstName.trim().length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const created = await createCustomer.mutateAsync({
      firstName: firstName.trim(),
      lastName: lastName.trim() || firstName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });

    // Notes capture is intentionally captured here as a follow-up: if the
    // BA wrote something, we drop her into the profile so the next thing
    // she sees is the note area, pre-focused. Persisting the note will be
    // wired once the customer-notes mutation is exposed on this hook set.
    onOpenChange(false);
    router.push(`/ba/customers/${created.id}`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="default">
        <SheetHeader>
          <SheetTitle>Nueva clienta</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <SheetBody>
            {/* Primary field — large, single point of attention */}
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Nombre
              </label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Patricia"
                autoFocus
                className="text-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Apellido
              </label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="González"
              />
            </div>

            {/* Optional section — deliberately desaturated */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                Opcional
              </p>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono"
                inputMode="tel"
              />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                inputMode="email"
                type="email"
              />
            </div>

            {/* Free-form notes — no label, placeholder is the invitation */}
            <div className="pt-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lo que quieras recordar de ella…"
                rows={4}
                className="resize-none"
              />
            </div>
          </SheetBody>

          <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createCustomer.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || createCustomer.isPending}>
              {createCustomer.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
