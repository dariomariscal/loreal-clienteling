"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
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
import { getFieldError, getGlobalError } from "@/lib/auth/clerk-errors";

const acceptSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type AcceptValues = z.infer<typeof acceptSchema>;

export function AcceptInvitationForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticket = searchParams.get("__clerk_ticket");

  const [error, setError] = useState<string | null>(null);

  const form = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { password: "" },
  });

  if (!ticket) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Invitación inválida
          </h1>
          <p className="text-sm text-muted-foreground">
            El enlace expiró o es incorrecto. Pide uno nuevo a tu administrador.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(data: AcceptValues) {
    if (!isLoaded) return;
    setError(null);

    try {
      const attempt = await signUp.create({
        strategy: "ticket",
        ticket: ticket!,
        password: data.password,
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

      setError(`Estado inesperado: ${attempt.status}`);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const passwordError = getFieldError(err.errors, "password");
        const globalError = getGlobalError(err.errors);
        if (passwordError) form.setError("password", { message: passwordError });
        if (globalError) setError(globalError);
        else if (!passwordError) setError("No pudimos activar tu cuenta.");
      } else {
        setError("Ocurrió un error. Intenta de nuevo.");
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-light tracking-tight text-foreground">
          Activa tu cuenta
        </h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido(a) a L&apos;Oréal Clienteling. Crea una contraseña para
          continuar.
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                  />
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
              disabled={!isLoaded || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Activando..." : "Activar cuenta"}
            </Button>
          </div>

          {/* Bot protection widget si Clerk lo requiere en este entorno. */}
          <div id="clerk-captcha" />
        </form>
      </Form>
    </div>
  );
}
