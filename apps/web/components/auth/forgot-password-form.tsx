"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import type { ClerkAPIError } from "@clerk/types";
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

type Step = "request" | "verify";

const requestSchema = z.object({
  email: z.string().email("Correo inválido"),
});

const verifySchema = z.object({
  code: z.string().min(1, "Ingresa el código"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type RequestValues = z.infer<typeof requestSchema>;
type VerifyValues = z.infer<typeof verifySchema>;

export function ForgotPasswordForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [globalError, setGlobalErrorState] = useState<string | null>(null);

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  const verifyForm = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "", password: "" },
  });

  function applyClerkErrors(
    errors: ClerkAPIError[],
    form: typeof requestForm | typeof verifyForm,
    fieldMap: Record<string, string>,
  ) {
    let handled = false;
    for (const [clerkField, formField] of Object.entries(fieldMap)) {
      const fieldErr = getFieldError(errors, clerkField);
      if (fieldErr) {
        form.setError(formField as never, { message: fieldErr });
        handled = true;
      }
    }
    const gErr = getGlobalError(errors);
    if (gErr) {
      setGlobalErrorState(gErr);
      handled = true;
    }
    return handled;
  }

  async function handleRequestCode(data: RequestValues) {
    if (!isLoaded) return;
    setGlobalErrorState(null);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: data.email.trim(),
      });
      setEmail(data.email.trim());
      setStep("verify");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        if (
          !applyClerkErrors(err.errors, requestForm, { identifier: "email" })
        ) {
          setGlobalErrorState("No pudimos enviar el código.");
        }
      } else {
        setGlobalErrorState("Ocurrió un error. Intenta de nuevo.");
      }
    }
  }

  async function handleVerifyCode(data: VerifyValues) {
    if (!isLoaded) return;
    setGlobalErrorState(null);

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: data.code.trim(),
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

      setGlobalErrorState(`Estado inesperado: ${attempt.status}`);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        if (
          !applyClerkErrors(err.errors, verifyForm, {
            code: "code",
            password: "password",
          })
        ) {
          setGlobalErrorState("No pudimos restablecer la contraseña.");
        }
      } else {
        setGlobalErrorState("Ocurrió un error. Intenta de nuevo.");
      }
    }
  }

  if (step === "request") {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Te enviaremos un código a tu correo para que la restablezcas.
          </p>
        </div>

        <Form {...requestForm}>
          <form
            onSubmit={requestForm.handleSubmit(handleRequestCode)}
            className="space-y-5"
            noValidate
          >
            {globalError && (
              <Alert variant="destructive">
                <AlertDescription>{globalError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={requestForm.control}
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

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!isLoaded || requestForm.formState.isSubmitting}
              >
                {requestForm.formState.isSubmitting
                  ? "Enviando..."
                  : "Enviar código"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-light tracking-tight text-foreground">
          Verifica el código
        </h1>
        <p className="text-sm text-muted-foreground">
          Enviamos un código a{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>

      <Form {...verifyForm}>
        <form
          onSubmit={verifyForm.handleSubmit(handleVerifyCode)}
          className="space-y-5"
          noValidate
        >
          {globalError && (
            <Alert variant="destructive">
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={verifyForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={verifyForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
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

          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!isLoaded || verifyForm.formState.isSubmitting}
            >
              {verifyForm.formState.isSubmitting
                ? "Cambiando..."
                : "Cambiar contraseña"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("request");
                setGlobalErrorState(null);
                verifyForm.reset();
              }}
            >
              Usar otro correo
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
