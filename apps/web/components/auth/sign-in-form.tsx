"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { EyeGlyph, EyeOffGlyph } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { formatFieldError } from "@/lib/auth/clerk-errors";

const signInSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  // Clerk v7 (Core 3) — `useSignIn` now returns the SignInFuture signal:
  // sign-in actions live on `signIn.<method>`, the activation step is
  // `signIn.finalize` (replaces `setActive({ session: createdSessionId })`),
  // and errors arrive structured as `{ fields, global, raw }`.
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loading = fetchStatus === "fetching";

  // If Clerk already has an active session (e.g. user hit /sign-in directly
  // while still authenticated), bounce them to the dashboard so they don't
  // hit the "already signed in" error on submit.
  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;
    const redirectUrl = searchParams.get("redirect_url") ?? "/";
    router.replace(redirectUrl);
  }, [authLoaded, isSignedIn, router, searchParams]);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function attemptSignIn(email: string, password: string) {
    setError(null);

    const passwordResult = await signIn.password({
      identifier: email.trim(),
      password,
    });

    if (passwordResult.error) {
      applyErrorsToForm();
      return;
    }

    if (signIn.status !== "complete") {
      setError(`Estado inesperado: ${signIn.status}`);
      return;
    }

    const redirectUrl = searchParams.get("redirect_url") ?? "/";
    const finalizeResult = await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          router.push(`/tasks/${session.currentTask.key}`);
          return;
        }
        router.push(redirectUrl);
      },
    });

    if (finalizeResult.error) {
      applyErrorsToForm();
    }
  }

  function applyErrorsToForm() {
    const emailMessage = formatFieldError(errors.fields.identifier);
    const passwordMessage = formatFieldError(errors.fields.password);
    const globalMessage = errors.global?.[0]?.message;

    if (emailMessage) form.setError("email", { message: emailMessage });
    if (passwordMessage) form.setError("password", { message: passwordMessage });
    if (globalMessage) setError(globalMessage);
    if (!emailMessage && !passwordMessage && !globalMessage) {
      setError("Error al iniciar sesión");
    }
  }

  function handleSubmit(data: SignInValues) {
    return attemptSignIn(data.email, data.password);
  }

  return (
    <div className="space-y-8">
      {/* Header — Zen typographic intro */}
      <div className="space-y-2">
        <h1 className="text-2xl font-light tracking-tight text-foreground">
          Iniciar sesión
        </h1>
        <p className="text-sm text-muted-foreground">
          Accede a tu cuenta de L&apos;Oréal Clienteling
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5"
          noValidate
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="usuario@loreal.mx"
                    autoComplete="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Contraseña</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffGlyph className="h-4 w-4" />
                      ) : (
                        <EyeGlyph className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>
          </div>
        </form>
      </Form>

    </div>
  );
}
