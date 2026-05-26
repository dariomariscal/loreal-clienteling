"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
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
import { getFieldError, getGlobalError } from "@/lib/auth/clerk-errors";

const signInSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type SignInValues = z.infer<typeof signInSchema>;

type DemoUser = {
  role: string;
  fullName: string;
  email: string;
  password: string;
  blurb: string;
};

const DEMO_USERS: readonly DemoUser[] = [
  {
    role: "NRM",
    fullName: "Diana Nacional",
    email: "d.nacional@loreal.mx",
    password: "Loreal2026!Demo",
    blurb: "5 regiones · $33M",
  },
  {
    role: "Admin",
    fullName: "Admin Central",
    email: "admin@loreal.mx",
    password: "LorealAdmin2026",
    blurb: "Acceso total",
  },
  {
    role: "Area Manager",
    fullName: "Diego Puebla",
    email: "d.puebla@loreal.mx",
    password: "trWx=xPk59c^^!LP",
    blurb: "Centro · $18M",
  },
  {
    role: "Counter Manager",
    fullName: "Juan Perez",
    email: "j.perez@loreal.mx",
    password: "M%7cs5Je&ML5i#VG",
    blurb: "Polanco · YSL",
  },
  {
    role: "Beauty Advisor",
    fullName: "Ana Martinez",
    email: "a.martinez@loreal.mx",
    password: "cYe!_ePAwNuLAt!3",
    blurb: "Santa Fe · YSL",
  },
  {
    role: "Beauty Advisor",
    fullName: "Emiliano Alvarez",
    email: "e.alvarez@loreal.mx",
    password: "mango-violin-roca-7392",
    blurb: "Santa Fe · YSL",
  },
  {
    role: "Beauty Advisor",
    fullName: "Moy Nousairi",
    email: "m.nousairi@loreal.mx",
    password: "GyR^#MS$ma_#6P+W",
    blurb: "Polanco · Lancôme",
  },
];

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (!isLoaded) return;

    setError(null);
    setLoading(true);

    try {
      const attempt = await signIn.create({
        strategy: "password",
        identifier: email.trim(),
        password,
      });

      if (attempt.status === "complete") {
        const redirectUrl = searchParams.get("redirect_url") ?? "/";
        await setActive({
          session: attempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              router.push(`/tasks/${session.currentTask.key}`);
              return;
            }
            router.push(redirectUrl);
          },
        });
        return;
      }

      setError(`Estado inesperado: ${attempt.status}`);
      setLoading(false);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        const emailError = getFieldError(err.errors, "identifier");
        const passwordError = getFieldError(err.errors, "password");
        const globalError = getGlobalError(err.errors);

        if (emailError) form.setError("email", { message: emailError });
        if (passwordError) form.setError("password", { message: passwordError });
        if (globalError) setError(globalError);
        else if (!emailError && !passwordError) {
          setError("Error al iniciar sesión");
        }
      } else {
        setError("Ocurrió un error. Intenta de nuevo.");
      }
      setLoading(false);
    }
  }

  function handleSubmit(data: SignInValues) {
    return attemptSignIn(data.email, data.password);
  }

  function handleDemoLogin(user: DemoUser) {
    form.setValue("email", user.email);
    form.setValue("password", user.password);
    return attemptSignIn(user.email, user.password);
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
              disabled={!isLoaded || loading}
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>
          </div>
        </form>
      </Form>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            demo · acceso rápido
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_USERS.map((user) => (
            <button
              key={user.email}
              type="button"
              onClick={() => handleDemoLogin(user)}
              disabled={!isLoaded || loading}
              className="group flex flex-col items-start gap-1 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:border-foreground/40 hover:bg-muted disabled:opacity-50 disabled:hover:bg-background"
            >
              <span className="inline-flex h-4 items-center rounded-sm bg-muted px-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground group-hover:bg-foreground/10">
                {user.role}
              </span>
              <span className="text-xs font-medium text-foreground">{user.fullName}</span>
              <span className="text-[10px] text-muted-foreground">{user.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
