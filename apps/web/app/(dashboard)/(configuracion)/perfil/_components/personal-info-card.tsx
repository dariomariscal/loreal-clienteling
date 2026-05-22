"use client";

import { useEffect, useState } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LockGlyph, CheckGlyph } from "@/components/ui/glyphs";
import {
  getFieldError,
  getGlobalError,
} from "@/lib/auth/clerk-errors";
import { api } from "@/lib/api-client";

const schema = z.object({
  firstName: z.string().min(1, "Ingresa tu nombre").max(100),
  lastName: z.string().max(100).optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

export function PersonalInfoCard() {
  const { isLoaded, user } = useUser();
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "" },
  });

  // Seed the form once Clerk's user object resolves. `reset` syncs both the
  // input values and the "dirty" baseline so the Guardar button only enables
  // on real edits.
  useEffect(() => {
    if (!isLoaded || !user) return;
    form.reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    });
  }, [isLoaded, user, form]);

  if (!isLoaded || !user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";

  async function onSubmit(values: Values) {
    if (!user) return;
    setGlobalError(null);
    setSuccess(false);

    const firstName = values.firstName.trim();
    const lastName = values.lastName?.trim() ?? "";

    try {
      await user.update({ firstName, lastName });
      await user.reload();

      // Mirror the change to our local DB so SQL listings (sidebar, equipo,
      // audit) reflect it before the next Clerk webhook lands.
      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      try {
        await api.patch("/users/me", { fullName });
      } catch {
        // The webhook will catch up — surface the Clerk success regardless.
      }

      form.reset({ firstName, lastName });
      setSuccess(true);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const firstNameErr = getFieldError(err.errors, "first_name");
        const lastNameErr = getFieldError(err.errors, "last_name");
        if (firstNameErr) form.setError("firstName", { message: firstNameErr });
        if (lastNameErr) form.setError("lastName", { message: lastNameErr });
        const g = getGlobalError(err.errors);
        if (g) setGlobalError(g);
        else if (!firstNameErr && !lastNameErr) {
          setGlobalError("No se pudieron guardar los cambios.");
        }
      } else {
        setGlobalError("No se pudieron guardar los cambios. Intenta de nuevo.");
      }
    }
  }

  const { isSubmitting, isDirty } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
        <CardDescription>
          Tu nombre se mostrará en el sidebar, en clientes y en mensajes.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="given-name"
                        placeholder="María"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="family-name"
                        placeholder="López"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-medium leading-none text-muted-foreground">
                Correo
                <LockGlyph className="size-3.5" />
              </label>
              <Input
                value={email}
                disabled
                readOnly
                aria-label="Correo (no editable)"
              />
              <p className="text-xs text-muted-foreground">
                Tu correo lo administra un administrador.
              </p>
            </div>

            {globalError && (
              <Alert variant="destructive">
                <AlertDescription>{globalError}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <CheckGlyph className="size-4" />
                <AlertDescription>
                  Tus datos se actualizaron correctamente.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!isDirty || isSubmitting}
              onClick={() => {
                form.reset({
                  firstName: user.firstName ?? "",
                  lastName: user.lastName ?? "",
                });
                setSuccess(false);
                setGlobalError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty || isSubmitting}
            >
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
