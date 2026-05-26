"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GENDERS } from "@loreal/contracts";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SignaturePad } from "@/components/ui/signature-pad";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { cn } from "@/lib/utils";
import {
  useDuplicateCheck,
  useRegisterCustomer,
  useActivePrivacyNotice,
} from "@/lib/hooks";
import { uploadFile } from "@/lib/hooks/use-uploads";
import {
  registrationBasicsSchema,
  registrationConsentSchema,
  registrationSearchSchema,
  type RegistrationBasicsValues,
  type RegistrationConsentValues,
  type RegistrationSearchValues,
} from "@/lib/schemas/customer-registration";

// iPad-first registration wizard. Same 3-step flow as the dashboard
// (search → datos → consentimiento) but with larger touch targets, the
// Step header style shared with AppointmentSheet, and the signature
// pad expanded for the customer to sign on the iPad.

type WizardStep = "search" | "basics" | "consent";

const STEP_ORDER: WizardStep[] = ["search", "basics", "consent"];
const STEP_LABELS: Record<WizardStep, string> = {
  search: "Buscar",
  basics: "Datos",
  consent: "Consentimiento",
};

const GENDER_LABELS: Record<string, string> = {
  female: "Femenino",
  male: "Masculino",
  non_binary: "No binario",
  prefer_not_say: "Prefiere no decir",
};

const MARKETING_CHANNEL_LABELS: Record<
  keyof RegistrationConsentValues["marketingChannels"],
  { label: string; helper: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    helper: "Seguimientos personalizados y recordatorios",
  },
  email: {
    label: "Email",
    helper: "Promociones y novedades de marca",
  },
  sms: {
    label: "SMS",
    helper: "Confirmaciones de cita y ofertas",
  },
};

interface NewCustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCustomerSheet({ open, onOpenChange }: NewCustomerSheetProps) {
  const router = useRouter();
  const registerCustomer = useRegisterCustomer();

  const [step, setStep] = React.useState<WizardStep>("search");
  const [searchValues, setSearchValues] = React.useState<RegistrationSearchValues>({
    email: "",
    phone: "",
  });
  const [basicsValues, setBasicsValues] =
    React.useState<RegistrationBasicsValues | null>(null);

  function resetAndClose() {
    setStep("search");
    setSearchValues({ email: "", phone: "" });
    setBasicsValues(null);
    onOpenChange(false);
  }

  function handleSearchContinue(values: RegistrationSearchValues) {
    setSearchValues(values);
    setStep("basics");
  }

  function handleBasicsContinue(values: RegistrationBasicsValues) {
    setBasicsValues(values);
    setStep("consent");
  }

  async function handleConsentSubmit(
    values: RegistrationConsentValues,
    privacyNoticeVersion: string,
  ) {
    if (!basicsValues) return;

    const signatureFile = dataUrlToFile(
      values.signatureDataUrl,
      `signature-${Date.now()}.png`,
    );
    const signatureUrl = await uploadFile(signatureFile, "signatures");

    const created = await registerCustomer.mutateAsync({
      customer: {
        firstName: basicsValues.firstName,
        lastName: basicsValues.lastName,
        email: basicsValues.email || undefined,
        phone: basicsValues.phone || undefined,
        gender: basicsValues.gender || undefined,
        birthday: basicsValues.birthday
          ? new Date(basicsValues.birthday)
          : undefined,
      },
      consents: {
        privacyNoticeVersion,
        signatureUrl,
        marketingChannels: values.marketingChannels,
      },
    });

    resetAndClose();
    router.push(`/advisor/customers/${created.id}`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) resetAndClose();
        else onOpenChange(true);
      }}
    >
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Registrar nueva clienta</SheetTitle>
          <SheetDescription>
            {step === "consent"
              ? "Pásale el iPad a la clienta para que lea, firme y elija sus preferencias."
              : "Captura sus datos en pocos pasos para abrir su perfil."}
          </SheetDescription>
          <StepIndicator current={step} />
        </SheetHeader>

        <SheetBody className="space-y-6!">
          {step === "search" && (
            <StepSearch
              defaultValues={searchValues}
              onContinue={handleSearchContinue}
              onCancel={resetAndClose}
            />
          )}

          {step === "basics" && (
            <StepBasics
              defaultValues={{
                email: searchValues.email,
                phone: searchValues.phone,
                ...(basicsValues ?? {}),
              }}
              onContinue={handleBasicsContinue}
              onBack={() => setStep("search")}
            />
          )}

          {step === "consent" && (
            <StepConsent
              onSubmit={handleConsentSubmit}
              onBack={() => setStep("basics")}
              isPending={registerCustomer.isPending}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

// ── Step indicator ───────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIndex = STEP_ORDER.indexOf(current);
  return (
    <ol className="mt-3 flex items-center gap-2 text-xs">
      {STEP_ORDER.map((s, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-[11px] font-medium transition-colors",
                isActive &&
                  "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent)] text-[color:var(--ba-accent-foreground)]",
                isDone &&
                  "border-[color:var(--ba-accent)]/60 bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]",
                !isActive && !isDone && "border-input text-muted-foreground",
              )}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-[12px]",
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {STEP_LABELS[s]}
            </span>
            {i < STEP_ORDER.length - 1 && (
              <span className="mx-1 h-px w-8 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Step 1: search before create ─────────────────────────────────

function StepSearch({
  defaultValues,
  onContinue,
  onCancel,
}: {
  defaultValues: RegistrationSearchValues;
  onContinue: (values: RegistrationSearchValues) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const form = useForm<RegistrationSearchValues>({
    resolver: zodResolver(registrationSearchSchema),
    defaultValues,
    mode: "onBlur",
  });

  const email = form.watch("email");
  const phone = form.watch("phone");
  const duplicateCheck = useDuplicateCheck({ email, phone });

  const matches = duplicateCheck.data?.matches ?? [];
  const hasMatch = matches.length > 0;

  function handleContinue() {
    onContinue({ email, phone });
  }

  return (
    <>
      <Form {...form}>
        <form
          id="advisor-new-customer-search"
          onSubmit={form.handleSubmit(handleContinue)}
          className="space-y-5"
        >
          <SectionHint
            number={1}
            title="Buscar antes de registrar"
            hint="Captura el email o teléfono — verificamos si ya existe en otra tienda."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="maria@ejemplo.com"
                      autoComplete="off"
                      inputMode="email"
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="5512345678"
                      inputMode="tel"
                      autoComplete="off"
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {duplicateCheck.isFetching && (
            <p className="text-xs text-muted-foreground">
              Buscando coincidencias…
            </p>
          )}

          {hasMatch && (
            <div className="space-y-2.5 rounded-2xl border border-warning/40 bg-warning/5 p-4">
              <p className="text-xs font-medium text-warning-foreground">
                {matches.length === 1
                  ? "Encontramos una clienta con esos datos:"
                  : `Encontramos ${matches.length} clientas con esos datos:`}
              </p>
              <ul className="space-y-2">
                {matches.map((m) => (
                  <li
                    key={m.customerId}
                    className="flex items-center justify-between gap-2 rounded-xl bg-background p-3"
                  >
                    <div className="flex items-center gap-3">
                      <CustomerAvatar
                        firstName={m.firstName}
                        lastName={m.lastName}
                        size="sm"
                      />
                      <div className="text-sm">
                        <p className="font-medium leading-tight">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.storeName} · coincide por{" "}
                          {m.matchedOn === "email" ? "email" : "teléfono"}
                        </p>
                      </div>
                    </div>
                    {m.inUserScope ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-10"
                        onClick={() =>
                          router.push(`/advisor/customers/${m.customerId}`)
                        }
                      >
                        Abrir perfil
                      </Button>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        Otra tienda
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </Form>

      <SheetFooter>
        <SheetClose>
          <Button variant="ghost" className="h-11" onClick={onCancel}>
            Cancelar
          </Button>
        </SheetClose>
        <div className="flex flex-1 justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => onContinue({ email: "", phone: "" })}
          >
            Saltar
          </Button>
          <Button
            type="submit"
            form="advisor-new-customer-search"
            className="h-11"
          >
            {hasMatch ? "Es nueva, continuar" : "Continuar"}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

// ── Step 2: basics ───────────────────────────────────────────────

function StepBasics({
  defaultValues,
  onContinue,
  onBack,
}: {
  defaultValues: Partial<RegistrationBasicsValues>;
  onContinue: (values: RegistrationBasicsValues) => void;
  onBack: () => void;
}) {
  const form = useForm<RegistrationBasicsValues>({
    resolver: zodResolver(registrationBasicsSchema),
    defaultValues: {
      firstName: defaultValues.firstName ?? "",
      lastName: defaultValues.lastName ?? "",
      email: defaultValues.email ?? "",
      phone: defaultValues.phone ?? "",
      gender: defaultValues.gender ?? "",
      birthday: defaultValues.birthday ?? "",
    },
    mode: "onBlur",
  });

  return (
    <>
      <Form {...form}>
        <form
          id="advisor-new-customer-basics"
          onSubmit={form.handleSubmit(onContinue)}
          className="space-y-5"
        >
          <SectionHint
            number={2}
            title="Datos de contacto"
            hint="Solo nombre y apellido son obligatorios. Captura al menos email o teléfono."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="María"
                      autoComplete="off"
                      className="h-12 text-base"
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
                      {...field}
                      placeholder="García"
                      autoComplete="off"
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="maria@ejemplo.com"
                      autoComplete="off"
                      inputMode="email"
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="5512345678"
                      inputMode="tel"
                      autoComplete="off"
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Género</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Seleccionar">
                          {field.value
                            ? GENDER_LABELS[field.value] ?? field.value
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {GENDER_LABELS[g] ?? g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de nacimiento</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>

      <SheetFooter>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          onClick={onBack}
        >
          Atrás
        </Button>
        <Button
          type="submit"
          form="advisor-new-customer-basics"
          className="ml-auto h-11"
        >
          Continuar
        </Button>
      </SheetFooter>
    </>
  );
}

// ── Step 3: consent + signature ──────────────────────────────────

function StepConsent({
  onSubmit,
  onBack,
  isPending,
}: {
  onSubmit: (values: RegistrationConsentValues, version: string) => void;
  onBack: () => void;
  isPending: boolean;
}) {
  const noticeQuery = useActivePrivacyNotice("es-MX");
  const notice = noticeQuery.data;

  const form = useForm<RegistrationConsentValues>({
    resolver: zodResolver(registrationConsentSchema),
    defaultValues: {
      privacyNoticeAccepted: false as unknown as true,
      signatureDataUrl: "",
      marketingChannels: { email: false, sms: false, whatsapp: false },
    },
    mode: "onChange",
  });

  function handleSubmit(values: RegistrationConsentValues) {
    if (!notice) return;
    onSubmit(values, notice.version);
  }

  if (noticeQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargando aviso de privacidad…
      </p>
    );
  }

  if (!notice) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar el aviso de privacidad activo. Intenta de nuevo o
        contacta soporte.
      </p>
    );
  }

  return (
    <>
      <Form {...form}>
        <form
          id="advisor-new-customer-consent"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          <SectionHint
            number={3}
            title="Aviso de privacidad y consentimiento"
            hint="Entrega el iPad a la clienta para que lea, firme y elija canales."
          />

          {/* Privacy notice */}
          <div className="space-y-2.5 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">{notice.title}</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                v{notice.version} ·{" "}
                {new Date(notice.effectiveFrom).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-input bg-background p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {notice.bodyMarkdown}
            </div>

            <FormField
              control={form.control}
              name="privacyNoticeAccepted"
              render={({ field }) => (
                <FormItem>
                  <label
                    htmlFor="privacy-notice-accept"
                    className="flex cursor-pointer items-start gap-3 rounded-xl p-2 transition-colors hover:bg-background/50"
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        id="privacy-notice-accept"
                        className="mt-0.5 size-5"
                      />
                    </FormControl>
                    <span className="text-sm leading-snug">
                      He leído y acepto el aviso de privacidad versión{" "}
                      {notice.version}.
                    </span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Marketing channels */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">
                ¿Cómo quiere recibir comunicaciones?
              </Label>
              <p className="text-xs text-muted-foreground">
                Opcional. Puede marcar varios canales o ninguno; lo puede
                cambiar después.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {(
                Object.keys(MARKETING_CHANNEL_LABELS) as Array<
                  keyof typeof MARKETING_CHANNEL_LABELS
                >
              ).map((channel) => (
                <FormField
                  key={channel}
                  control={form.control}
                  name={`marketingChannels.${channel}`}
                  render={({ field }) => {
                    const checked = field.value === true;
                    return (
                      <FormItem>
                        <label
                          htmlFor={`marketing-${channel}`}
                          className={cn(
                            "flex h-full cursor-pointer flex-col gap-1 rounded-2xl border p-3 transition-colors",
                            checked
                              ? "border-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)]"
                              : "border-border/60 bg-background hover:bg-muted/30",
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <FormControl>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  field.onChange(v === true)
                                }
                                id={`marketing-${channel}`}
                                className="size-5"
                              />
                            </FormControl>
                            <span className="text-sm font-medium">
                              {MARKETING_CHANNEL_LABELS[channel].label}
                            </span>
                          </div>
                          <span className="pl-7 text-xs text-muted-foreground">
                            {MARKETING_CHANNEL_LABELS[channel].helper}
                          </span>
                        </label>
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>
          </div>

          {/* Signature */}
          <FormField
            control={form.control}
            name="signatureDataUrl"
            render={({ field }) => (
              <FormItem>
                <Label className="text-sm font-medium">
                  Firma de la clienta
                </Label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Pídele que firme con el dedo en el recuadro.
                </p>
                <FormControl>
                  <SignaturePad
                    onChange={(dataUrl) => field.onChange(dataUrl ?? "")}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <SheetFooter>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          onClick={onBack}
          disabled={isPending}
        >
          Atrás
        </Button>
        <Button
          type="submit"
          form="advisor-new-customer-consent"
          className="ml-auto h-11"
          disabled={isPending}
        >
          {isPending ? "Registrando…" : "Registrar clienta"}
        </Button>
      </SheetFooter>
    </>
  );
}

// ── Pieces ───────────────────────────────────────────────────────

function SectionHint({
  number,
  title,
  hint,
}: {
  number: number;
  title: string;
  hint: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background">
          {number}
        </span>
        <h3 className="text-[11px] font-medium uppercase tracking-widest text-foreground">
          {title}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:([^;]+);base64/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
