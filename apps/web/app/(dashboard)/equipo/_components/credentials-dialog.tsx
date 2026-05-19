"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useUsers, useUserPassword } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CredentialsDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the password is fetched and shown immediately on open. */
  autoReveal?: boolean;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      <span className="sr-only">Copiar</span>
    </Button>
  );
}

export function CredentialsDialog({
  userId,
  open,
  onOpenChange,
  autoReveal = false,
}: CredentialsDialogProps) {
  const [revealed, setRevealed] = useState(autoReveal);
  const { data: passwordData, isLoading, error } = useUserPassword(userId, open && revealed);
  const { data: usersData } = useUsers();
  const userRow = usersData?.data.find((u) => u.id === userId);

  // Reset visibility whenever the dialog opens for a different user.
  useEffect(() => {
    if (open) setRevealed(autoReveal);
  }, [open, userId, autoReveal]);

  const password = passwordData?.password ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credenciales del usuario</DialogTitle>
          <DialogDescription>
            Solo los administradores pueden ver estas credenciales. Compártelas de
            forma segura — no aparecen en correos.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Correo
            </label>
            <div className="flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-sm">
                {userRow?.email ?? "—"}
              </div>
              {userRow?.email ? <CopyButton value={userRow.email} /> : null}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Contraseña
            </label>
            <div className="flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-sm">
                {!revealed
                  ? "••••••••••••••"
                  : isLoading
                    ? "Cargando..."
                    : error
                      ? "Sin credenciales recuperables"
                      : password}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRevealed((v) => !v)}
              >
                {revealed ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
                <span className="sr-only">
                  {revealed ? "Ocultar" : "Mostrar"}
                </span>
              </Button>
              {revealed && password ? <CopyButton value={password} /> : null}
            </div>
            {error ? (
              <p className="mt-1 text-xs text-destructive">
                Este usuario fue invitado y eligió su propia contraseña, por lo que
                no se puede recuperar.
              </p>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
