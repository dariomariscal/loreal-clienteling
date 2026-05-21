"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser, useAuth } from "@clerk/nextjs";
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
import { api } from "@/lib/api-client";
import { ROUTES } from "@/lib/constants";
import { getFieldError, getGlobalError } from "@/lib/auth/clerk-errors";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa la contraseña actual"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "La nueva contraseña debe ser distinta a la temporal",
    path: ["newPassword"],
  });

type Values = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const { isLoaded, user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function handleSubmit(values: Values) {
    if (!isLoaded || !user) return;
    setGlobalError(null);
    setLoading(true);

    try {
      await user.updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        signOutOfOtherSessions: true,
      });

      // Clear the must-change flag on the server. We also reload the user
      // so the next sessionClaims read picks up the fresh publicMetadata.
      await api.post("/users/me/acknowledge-password-change", {});
      await user.reload();

      router.push(ROUTES.DASHBOARD);
      router.refresh();
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const current = getFieldError(err.errors, "current_password");
        const next = getFieldError(err.errors, "password");
        const global = getGlobalError(err.errors);
        if (current) form.setError("currentPassword", { message: current });
        if (next) form.setError("newPassword", { message: next });
        if (global) setGlobalError(global);
        else if (!current && !next) {
          setGlobalError("No pudimos cambiar la contraseña.");
        }
      } else {
        setGlobalError("Ocurrió un error. Intenta de nuevo.");
      }
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push(ROUTES.SIGN_IN);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-light tracking-tight text-foreground">
          Cambia tu contraseña
        </h1>
        <p className="text-sm text-muted-foreground">
          Tu contraseña actual es temporal. Define una nueva para continuar.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5"
          noValidate
        >
          {globalError && (
            <Alert variant="destructive">
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña temporal</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="current-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirma la nueva contraseña</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!isLoaded || loading}
            >
              {loading ? "Guardando..." : "Guardar contraseña"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              size="sm"
              onClick={handleSignOut}
              disabled={loading}
            >
              Cerrar sesión
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
