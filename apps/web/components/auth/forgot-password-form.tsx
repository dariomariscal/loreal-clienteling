"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import type { ClerkAPIError } from "@clerk/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFieldError, getGlobalError } from "@/lib/auth/clerk-errors";

type Step = "request" | "verify";

export function ForgotPasswordForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ClerkAPIError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

    setErrors([]);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("email") ?? "").trim();

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier,
      });
      setEmail(identifier);
      setStep("verify");
    } catch (err) {
      if (isClerkAPIResponseError(err)) setErrors(err.errors);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

    setErrors([]);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (attempt.status === "complete") {
        await setActive({
          session: attempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              router.push(`/tasks/${session.currentTask.key}`);
              return;
            }
            router.push("/");
          },
        });
        return;
      }

      setErrors([
        {
          code: "unsupported_status",
          message: `Estado inesperado: ${attempt.status}`,
          longMessage: "No pudimos restablecer la contraseña.",
        } as ClerkAPIError,
      ]);
    } catch (err) {
      if (isClerkAPIResponseError(err)) setErrors(err.errors);
    } finally {
      setIsSubmitting(false);
    }
  }

  const globalError = getGlobalError(errors);
  const emailError = getFieldError(errors, "identifier");
  const codeError = getFieldError(errors, "code");
  const passwordError = getFieldError(errors, "password");

  if (step === "request") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>
            Te enviaremos un código a tu correo para que la restablezcas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestCode} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={Boolean(emailError) || undefined}
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>

            {globalError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {globalError}
              </p>
            )}

            <Button type="submit" disabled={!isLoaded || isSubmitting} className="w-full">
              {isSubmitting ? "Enviando…" : "Enviar código"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Verifica el código</CardTitle>
        <CardDescription>
          Enviamos un código a <span className="font-medium text-foreground">{email}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerifyCode} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              aria-invalid={Boolean(codeError) || undefined}
            />
            {codeError && <p className="text-xs text-destructive">{codeError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(passwordError) || undefined}
            />
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          </div>

          {globalError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {globalError}
            </p>
          )}

          <Button type="submit" disabled={!isLoaded || isSubmitting} className="w-full">
            {isSubmitting ? "Cambiando…" : "Cambiar contraseña"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("request");
              setErrors([]);
            }}
          >
            Usar otro correo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
