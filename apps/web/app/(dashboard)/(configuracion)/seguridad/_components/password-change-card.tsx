"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CheckGlyph, EyeGlyph, EyeOffGlyph } from "@/components/ui/glyphs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getFieldError,
  getGlobalError,
} from "@/lib/auth/clerk-errors";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    signOutOfOtherSessions: z.boolean(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["newPassword"],
  });

type Values = z.infer<typeof schema>;

export function PasswordChangeCard() {
  const { isLoaded, user } = useUser();
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      signOutOfOtherSessions: true,
    },
  });

  if (!isLoaded || !user) return null;

  // Users authenticated only via SSO/OAuth (or who never set a password)
  // can't change one — surface that instead of letting Clerk throw a generic
  // error on submit.
  if (!user.passwordEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contraseña</CardTitle>
          <CardDescription>
            Tu cuenta no tiene una contraseña configurada. Inicias sesión con
            un proveedor externo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function onSubmit(values: Values) {
    if (!user) return;
    setGlobalError(null);
    setSuccess(false);

    try {
      await user.updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        signOutOfOtherSessions: values.signOutOfOtherSessions,
      });
      form.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        signOutOfOtherSessions: values.signOutOfOtherSessions,
      });
      setSuccess(true);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const currentErr = getFieldError(err.errors, "current_password");
        const newErr = getFieldError(err.errors, "new_password") ??
          getFieldError(err.errors, "password");
        if (currentErr) {
          form.setError("currentPassword", { message: currentErr });
        }
        if (newErr) form.setError("newPassword", { message: newErr });
        const g = getGlobalError(err.errors);
        if (g) setGlobalError(g);
        else if (!currentErr && !newErr) {
          setGlobalError("No se pudo cambiar la contraseña.");
        }
      } else {
        setGlobalError("No se pudo cambiar la contraseña. Intenta de nuevo.");
      }
    }
  }

  const { isSubmitting } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>
          Para tu seguridad, necesitamos tu contraseña actual antes de cambiarla.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Mínimo 8 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nueva contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="signOutOfOtherSessions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <FormControl>
                    <Checkbox
                      id="sign-out-others"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-tight">
                    <Label
                      htmlFor="sign-out-others"
                      className="cursor-pointer text-sm"
                    >
                      Cerrar sesión en otros dispositivos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Recomendado si alguien más pudo haber usado tu cuenta.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {globalError && (
              <Alert variant="destructive">
                <AlertDescription>{globalError}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <CheckGlyph className="size-4" />
                <AlertDescription>
                  Tu contraseña se actualizó correctamente.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Cambiando…" : "Cambiar contraseña"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function PasswordInput({
  value,
  onChange,
  onBlur,
  name,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
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
  );
}
