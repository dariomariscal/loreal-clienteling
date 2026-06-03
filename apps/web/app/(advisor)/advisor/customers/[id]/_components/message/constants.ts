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

import type { CampaignType } from "@loreal/contracts";

export const CAMPAIGN_TYPES: ReadonlyArray<{
  value: CampaignType;
  label: string;
}> = [
  { value: "post_purchase", label: "Post-compra" },
  { value: "win_back", label: "Win-back" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "replenishment", label: "Reposición" },
  { value: "special_event", label: "Evento" },
  { value: "custom", label: "Personalizado" },
];

export function composerPlaceholder(channel: ChannelValue): string {
  if (channel === "whatsapp") return "Mensaje por WhatsApp…";
  if (channel === "sms") return "Mensaje por SMS…";
  return "Cuerpo del email…";
}
