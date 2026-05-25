import { z } from "zod";
import { GENDERS } from "@loreal/contracts";

/**
 * Normalize whatever the BA typed into a clean 10-digit MX phone. Accepts
 * "+52 55 1234 5678", "(55) 1234-5678", "5512345678" — strips the country
 * code if present and every non-digit. Returns "" for empty input so optional
 * fields stay optional.
 */
export function normalizeMxPhoneInput(value: string | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("52")) return digits.slice(2);
  return digits;
}

const optionalMxPhone = z
  .string()
  .transform((v) => normalizeMxPhoneInput(v))
  .refine((v) => v === "" || /^\d{10}$/.test(v), {
    message: "El teléfono debe tener 10 dígitos (formato MX)",
  });

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Email inválido",
  });

/**
 * Step 1 — search before create. The BA enters at least an email or phone so
 * we can dedup. Free-text name search lives in the listing page, not here.
 */
export const registrationSearchSchema = z
  .object({
    email: optionalEmail,
    phone: optionalMxPhone,
  })
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: "Captura email o teléfono para buscar duplicados",
    path: ["email"],
  });

export type RegistrationSearchValues = z.infer<typeof registrationSearchSchema>;

/**
 * Step 2 — basic identifying data (RF-01). Email or phone required; at least
 * one channel is needed to contact the customer afterwards.
 */
export const registrationBasicsSchema = z
  .object({
    firstName: z.string().trim().min(1, "Nombre requerido").max(100),
    lastName: z.string().trim().min(1, "Apellido requerido").max(100),
    email: optionalEmail,
    phone: optionalMxPhone,
    gender: z
      .enum(GENDERS as [string, ...string[]])
      .optional()
      .or(z.literal("")),
    birthday: z.string().optional(),
  })
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: "Captura email o teléfono para poder contactarla",
    path: ["email"],
  });

export type RegistrationBasicsValues = z.infer<typeof registrationBasicsSchema>;

/**
 * Step 3 — LFPDPPP consent + per-channel marketing preferences + signature.
 * Privacy notice acceptance is mandatory; channels are opt-in (default false
 * in the form, not in the schema — keeps input/output types aligned for RHF).
 */
export const registrationConsentSchema = z.object({
  privacyNoticeAccepted: z.literal(true, {
    message: "Debes aceptar el aviso de privacidad para registrar a la clienta",
  }),
  signatureDataUrl: z
    .string()
    .min(1, "Se requiere la firma de la clienta"),
  marketingChannels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    whatsapp: z.boolean(),
  }),
});

export type RegistrationConsentValues = z.infer<typeof registrationConsentSchema>;
