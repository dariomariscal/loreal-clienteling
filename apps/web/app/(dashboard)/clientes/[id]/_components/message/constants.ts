export const CHANNELS = [
  {
    value: "whatsapp",
    label: "WhatsApp",
    consentType: "marketing_whatsapp",
    accent: "#25D366",
  },
  {
    value: "sms",
    label: "SMS",
    consentType: "marketing_sms",
    accent: "#6B7280",
  },
  {
    value: "email",
    label: "Email",
    consentType: "marketing_email",
    accent: "#3B82F6",
  },
] as const;

export type ChannelValue = (typeof CHANNELS)[number]["value"];

export const FOLLOWUP_TYPES = [
  { value: "3_months", label: "Seguimiento 3m" },
  { value: "6_months", label: "Seguimiento 6m" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "replenishment", label: "Reposición" },
  { value: "special_event", label: "Evento" },
  { value: "custom", label: "Personalizado" },
] as const;

export function composerPlaceholder(channel: ChannelValue): string {
  if (channel === "whatsapp") return "Mensaje por WhatsApp…";
  if (channel === "sms") return "Mensaje por SMS…";
  return "Cuerpo del email…";
}
