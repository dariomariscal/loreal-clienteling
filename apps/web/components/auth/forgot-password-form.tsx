"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignIn } from "@clerk/nextjs";
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
  // Clerk v7 (Core 3) password reset is a three-step namespace flow:
  //   1. `signIn.create({ identifier })` — anchors the future resource to
  //      the email so subsequent steps know whose account is being reset.
  //   2. `signIn.resetPasswordEmailCode.sendCode()` — mails the code.
  //   3. `signIn.resetPasswordEmailCode.verifyCode({ code })` then
  //      `submitPassword({ password })` — finalizes the new password and
  //      `signIn.status` becomes `'complete'`.
  //   4. `signIn.finalize()` activates the new session.
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  const verifyForm = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "", password: "" },
  });

  function surfaceErrors(
    form: typeof requestForm | typeof verifyForm,
    fieldMap: Partial<Record<"identifier" | "code" | "password", string>>,
  ): boolean {
    let handled = false;
    for (const [clerkField, formField] of Object.entries(fieldMap)) {
      const message = formatFieldError(
        errors.fields[clerkField as keyof typeof errors.fields],
      );
      if (message) {
        form.setError(formField as never, { message });
        handled = true;
      }
    }
    const globalMessage = errors.global?.[0]?.message;
    if (globalMessage) {
      setGlobalError(globalMessage);
      handled = true;
    }
    return handled;
  }

  async function handleRequestCode(data: RequestValues) {
    setGlobalError(null);
    const identifier = data.email.trim();

    // Anchor the SignInFuture to the email so resetPasswordEmailCode knows
    // which account to send the code to.
    const createResult = await signIn.create({ identifier });
    if (createResult.error) {
      if (!surfaceErrors(requestForm, { identifier: "email" })) {
        setGlobalError("No pudimos enviar el código.");
      }
      return;
    }

    const sendResult = await signIn.resetPasswordEmailCode.sendCode();
    if (sendResult.error) {
      if (!surfaceErrors(requestForm, { identifier: "email" })) {
        setGlobalError("No pudimos enviar el código.");
      }
      return;
    }

    setEmail(identifier);
    setStep("verify");
  }

  async function handleVerifyCode(data: VerifyValues) {
    setGlobalError(null);

    const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({
      code: data.code.trim(),
    });
    if (verifyResult.error) {
      if (!surfaceErrors(verifyForm, { code: "code" })) {
        setGlobalError("No pudimos verificar el código.");
      }
      return;
    }

    const submitResult = await signIn.resetPasswordEmailCode.submitPassword({
      password: data.password,
    });
    if (submitResult.error) {
      if (!surfaceErrors(verifyForm, { password: "password" })) {
        setGlobalError("No pudimos restablecer la contraseña.");
      }
      return;
    }

    if (signIn.status !== "complete") {
      setGlobalError(`Estado inesperado: ${signIn.status}`);
      return;
    }

    const finalizeResult = await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          router.push(`/tasks/${session.currentTask.key}`);
          return;
        }
        router.push("/");
      },
    });
    if (finalizeResult.error) {
      setGlobalError("No pudimos iniciar la sesión.");
    }
  }

  const loading = fetchStatus === "fetching";

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
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar código"}
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
              disabled={loading}
            >
              {loading ? "Cambiando..." : "Cambiar contraseña"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("request");
                setGlobalError(null);
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
