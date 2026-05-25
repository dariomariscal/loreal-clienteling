/**
 * Shared vocabulary for the Beauty Advisor surface.
 *
 * The dashboard is the executive view (LTV, lifecycle stage, churn). The BA
 * surface speaks the language a Beauty Advisor would actually use with her
 * client and her manager. This module is the single source of truth for those
 * labels and shared formatting — every advisor screen pulls strings and
 * variants from here so we don't drift across components.
 */

export type LifecycleStage = "new" | "returning" | "vip" | "at_risk" | string;

type BadgeVariant = "default" | "secondary" | "info" | "success" | "warning" | "destructive" | "outline";

interface LifecycleMeta {
  label: string;
  variant: BadgeVariant;
}

const LIFECYCLE: Record<string, LifecycleMeta> = {
  new: { label: "Nueva", variant: "info" },
  returning: { label: "Habitual", variant: "secondary" },
  vip: { label: "VIP", variant: "success" },
  at_risk: { label: "Sin venir hace mucho", variant: "warning" },
};

export function lifecycleMeta(stage: LifecycleStage | null | undefined): LifecycleMeta {
  if (!stage) return { label: "Sin clasificar", variant: "secondary" };
  return LIFECYCLE[stage] ?? { label: stage, variant: "secondary" };
}

/**
 * Channel labels — the BA reads "WhatsApp por la tarde", never "channel = whatsapp".
 */
export function channelLabel(channel: string | null | undefined): string {
  if (!channel) return "Sin canal preferido";
  const map: Record<string, string> = {
    whatsapp: "WhatsApp",
    sms: "SMS",
    email: "Correo",
    phone: "Teléfono",
    wechat: "WeChat",
    line: "LINE",
  };
  return map[channel] ?? channel;
}

/**
 * Currency — Mexican market by default. Returns plain string so callers can
 * compose it ("Lo que ha gastado: $24,500").
 */
export function formatMoney(value: string | number, currency = "MXN"): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}
