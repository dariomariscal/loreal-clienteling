"use client";

import { useState } from "react";
import { useSession } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import type { SessionVerificationLevel } from "@clerk/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EyeGlyph, EyeOffGlyph } from "@/components/ui/glyphs";
import { getGlobalError } from "@/lib/auth/clerk-errors";

interface ReverificationDialogProps {
  /** When non-null, the dialog opens. Provided by `useReverification`'s
   *  `onNeedsReverification` callback. */
  state: {
    level: SessionVerificationLevel | undefined;
    complete: () => void;
    cancel: () => void;
  } | null;
  /** Called when the user dismisses the dialog (cancel path). */
  onClose: () => void;
}

/**
 * Custom step-up verification dialog. Replaces Clerk's default reverification
 * modal so the experience stays consistent with the rest of the settings UI.
 *
 * Today we only handle `first_factor` with password — that covers the L'Oréal
 * flows (no MFA enrolled). When `second_factor` arrives we'll extend this to
 * branch on `state.level` and render a TOTP/code input + the prepare/attempt
 * second-factor calls. Until then we surface a clear message instead of
 * silently failing.
 */
export function ReverificationDialog({
  state,
  onClose,
}: ReverificationDialogProps) {
  const { session } = useSession();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const open = state !== null;
  const level = state?.level;
  const supportsPasswordReverify =
    level === undefined || level === "first_factor";

  function reset() {
    setPassword("");
    setVisible(false);
    setError(null);
    setSubmitting(false);
  }

  function handleCancel() {
    state?.cancel();
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state || !session) return;
    if (!password) {
      setError("Ingresa tu contraseña para continuar.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Bootstrap the verification resource into `needs_first_factor` before
      // attempting it. Without this Clerk responds with "not ready for first
      // factor verification" because the session has no in-flight reverify.
      // Password is not a "preparable" factor (no email/code to send), so we
      // skip `prepareFirstFactorVerification` and attempt straight away.
      await session.startVerification({ level: "first_factor" });

      const result = await session.attemptFirstFactorVerification({
        strategy: "password",
        password,
      });

      if (result.status === "complete") {
        state.complete();
        reset();
        onClose();
        return;
      }

      // Some accounts may require a second factor after the first — at that
      // point Clerk returns "needs_second_factor" and we'd have to prepare
      // and attempt it. We don't have MFA enrolled today, so surface a clear
      // message rather than half-implementing it.
      setError(
        "Tu cuenta requiere un segundo factor que aún no soportamos en este flujo. Contacta a un administrador.",
      );
      setSubmitting(false);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(
          getGlobalError(err.errors) ?? "Contraseña incorrecta.",
        );
      } else {
        setError("No se pudo verificar. Intenta de nuevo.");
      }
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        // Treat any close-by-escape/overlay as a cancel so we don't leave the
        // outer mutation hanging.
        if (!value && state) handleCancel();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Confirma tu identidad</DialogTitle>
          <DialogDescription>
            Por seguridad, ingresa tu contraseña actual para continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            {!supportsPasswordReverify ? (
              <Alert variant="warning">
                <AlertDescription>
                  Tu cuenta requiere autenticación de dos factores que aún no
                  está habilitada en este flujo.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2.5">
                <Label htmlFor="reverify-password">Contraseña actual</Label>
                <div className="relative">
                  <Input
                    id="reverify-password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={
                      visible ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                  >
                    {visible ? (
                      <EyeOffGlyph className="size-4" />
                    ) : (
                      <EyeGlyph className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <DialogClose>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!supportsPasswordReverify || submitting}
            >
              {submitting ? "Verificando…" : "Verificar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
