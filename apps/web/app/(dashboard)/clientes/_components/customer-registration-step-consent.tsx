"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registrationConsentSchema,
  type RegistrationConsentValues,
} from "@/lib/schemas/customer-registration";
import { useActivePrivacyNotice } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/ui/signature-pad";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

interface CustomerRegistrationStepConsentProps {
  onSubmit: (values: RegistrationConsentValues, version: string) => void;
  onBack: () => void;
  isPending: boolean;
}

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

export function CustomerRegistrationStepConsent({
  onSubmit,
  onBack,
  isPending,
}: CustomerRegistrationStepConsentProps) {
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
        No se pudo cargar el aviso de privacidad activo. Intenta de nuevo o contacta soporte.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form
        id="customer-registration-consent-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Aviso de privacidad y consentimiento</h3>
          <p className="text-xs text-muted-foreground">
            Pásale el iPad a la clienta para que lea, firme y elija cómo quiere recibir comunicaciones.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{notice.title}</Label>
            <span className="text-xs text-muted-foreground">
              Versión {notice.version} ·{" "}
              {new Date(notice.effectiveFrom).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
            {notice.bodyMarkdown}
          </div>

          <FormField
            control={form.control}
            name="privacyNoticeAccepted"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-2.5 pt-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      id="privacy-notice-accept"
                    />
                  </FormControl>
                  <Label
                    htmlFor="privacy-notice-accept"
                    className="text-xs font-normal leading-snug"
                  >
                    He leído y acepto el aviso de privacidad versión {notice.version}.
                  </Label>
                </div>
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
              Opcional. Puede marcar varios canales o ninguno y cambiarlo después.
            </p>
          </div>

          <div className="space-y-2.5">
            {(Object.keys(MARKETING_CHANNEL_LABELS) as Array<
              keyof typeof MARKETING_CHANNEL_LABELS
            >).map((channel) => (
              <FormField
                key={channel}
                control={form.control}
                name={`marketingChannels.${channel}`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          id={`marketing-${channel}`}
                        />
                      </FormControl>
                      <Label
                        htmlFor={`marketing-${channel}`}
                        className="text-sm font-normal leading-tight"
                      >
                        {MARKETING_CHANNEL_LABELS[channel].label}
                        <span className="ml-1 text-xs text-muted-foreground">
                          — {MARKETING_CHANNEL_LABELS[channel].helper}
                        </span>
                      </Label>
                    </div>
                  </FormItem>
                )}
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
              <Label className="text-sm font-medium">Firma de la clienta</Label>
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

      <div className="flex justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isPending}
        >
          Atrás
        </Button>
        <Button
          type="submit"
          form="customer-registration-consent-form"
          disabled={isPending}
        >
          {isPending ? "Registrando…" : "Registrar clienta"}
        </Button>
      </div>
    </Form>
  );
}
