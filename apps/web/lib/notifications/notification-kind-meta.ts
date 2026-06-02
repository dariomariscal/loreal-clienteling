import {
  NotificationKind,
  type NotificationPriority,
} from "@loreal/contracts";
import {
  AlertCircleGlyph,
  AppointmentGlyph,
  CheckCircleGlyph,
  FollowupBirthdayGlyph,
  FollowupCheckInGlyph,
  FollowupReplenishmentGlyph,
  MessageGlyph,
  PackageGlyph,
  RoutineMorningGlyph,
  SparkleDotGlyph,
  StarGlyph,
  TagGlyph,
  UserPlusGlyph,
  VisitActiveGlyph,
} from "@/components/ui/glyphs";

type GlyphComponent = typeof MessageGlyph;

/**
 * Visual + copy metadata for each of the 17 notification kinds. Single source
 * of truth consumed by the bell badge, the dropdown row, the inbox page and
 * the settings page — adding a new kind means one entry here, never an
 * if/else in a component.
 */
export interface NotificationKindMeta {
  /** Glyph rendered next to the title in the row. */
  icon: GlyphComponent;
  /** es-MX human label used in settings and as the empty-state fallback. */
  label: string;
  /** Short helper for the settings page hint line. */
  description: string;
}

export const NOTIFICATION_KIND_META: Record<
  NotificationKind,
  NotificationKindMeta
> = {
  // ── Urgentes ────────────────────────────────────────────────────
  [NotificationKind.CUSTOMER_REPLY]: {
    icon: MessageGlyph,
    label: "Respuesta de clienta",
    description: "Cuando una clienta responde a un mensaje tuyo.",
  },
  [NotificationKind.APPOINTMENT_IMMINENT]: {
    icon: AppointmentGlyph,
    label: "Cita próxima",
    description: "30 y 10 minutos antes de cada cita.",
  },
  [NotificationKind.CUSTOMER_ARRIVED]: {
    icon: VisitActiveGlyph,
    label: "Clienta llegó al mostrador",
    description: "Cuando alguien del mostrador registra su visita.",
  },
  [NotificationKind.APPROVAL_DECIDED]: {
    icon: CheckCircleGlyph,
    label: "Aprobación decidida",
    description: "Resultado de una solicitud que enviaste a aprobación.",
  },

  // ── Importantes ─────────────────────────────────────────────────
  [NotificationKind.DAILY_ACTIONS_READY]: {
    icon: RoutineMorningGlyph,
    label: "Tareas del día listas",
    description: "Aviso matutino con tus seguimientos sugeridos.",
  },
  [NotificationKind.FOLLOWUP_OVERDUE]: {
    icon: AlertCircleGlyph,
    label: "Seguimiento atrasado",
    description: "Cuando una tarea pasa su fecha límite.",
  },
  [NotificationKind.WISHLIST_BACK_IN_STOCK]: {
    icon: PackageGlyph,
    label: "Wishlist regresó al inventario",
    description: "Un producto deseado por una clienta vuelve a estar disponible.",
  },
  [NotificationKind.WISHLIST_PRICE_DROP]: {
    icon: TagGlyph,
    label: "Bajó el precio de un wishlist",
    description: "Un producto deseado por una clienta bajó de precio.",
  },
  [NotificationKind.RESERVATION_EXPIRING]: {
    icon: SparkleDotGlyph,
    label: "Reservación por vencer",
    description: "Una reservación está por expirar pronto.",
  },
  [NotificationKind.MESSAGE_READ]: {
    icon: CheckCircleGlyph,
    label: "Clienta leyó tu mensaje",
    description: "Confirmación de lectura de un mensaje enviado.",
  },

  // ── Útiles ──────────────────────────────────────────────────────
  [NotificationKind.BIRTHDAY_TODAY]: {
    icon: FollowupBirthdayGlyph,
    label: "Cumpleaños hoy",
    description: "Una clienta cumple años hoy.",
  },
  [NotificationKind.SAMPLE_FOLLOWUP_DUE]: {
    icon: FollowupCheckInGlyph,
    label: "Seguimiento de muestra",
    description: "Hora de preguntar por la experiencia de una muestra que entregaste.",
  },
  [NotificationKind.DORMANT_CUSTOMER]: {
    icon: FollowupCheckInGlyph,
    label: "Clienta sin actividad",
    description: "Una clienta lleva tiempo sin interactuar.",
  },
  [NotificationKind.ABANDONED_CART]: {
    icon: PackageGlyph,
    label: "Carrito abandonado",
    description: "Una clienta dejó productos en el carrito sin terminar la compra.",
  },
  [NotificationKind.REPLENISHMENT_DUE]: {
    icon: FollowupReplenishmentGlyph,
    label: "Reposición sugerida",
    description: "Es buen momento para sugerir reponer un producto.",
  },
  [NotificationKind.BA_RATING_RECEIVED]: {
    icon: StarGlyph,
    label: "Recibiste una calificación",
    description: "Una clienta calificó tu servicio.",
  },
  [NotificationKind.NEW_CUSTOMER_ASSIGNED]: {
    icon: UserPlusGlyph,
    label: "Nueva clienta asignada",
    description: "Se te asignó una nueva clienta en tu cartera.",
  },
};

// ── Priority styling ──────────────────────────────────────────────

/**
 * Badge variant used to color-code the priority pill on a notification row.
 * Mirrors the variants already used in appointments-page.tsx (info/success/
 * warning/destructive) so the visual language stays consistent across the
 * advisor surface.
 */
export const NOTIFICATION_PRIORITY_VARIANT: Record<
  NotificationPriority,
  "default" | "info" | "success" | "warning" | "destructive" | "secondary"
> = {
  urgent: "destructive",
  high: "warning",
  normal: "info",
  low: "secondary",
};

export const NOTIFICATION_PRIORITY_LABEL: Record<NotificationPriority, string> =
  {
    urgent: "Urgente",
    high: "Importante",
    normal: "Aviso",
    low: "Informativo",
  };

// ── Grouping for settings page ────────────────────────────────────

/**
 * Settings groups the 17 toggles by urgency tier so the BA can scan and
 * silence "good to know" without losing the urgent ones. Order matters —
 * urgent first.
 */
export const NOTIFICATION_KIND_GROUPS: ReadonlyArray<{
  label: string;
  description: string;
  kinds: ReadonlyArray<NotificationKind>;
}> = [
  {
    label: "Urgentes",
    description: "Atender de inmediato.",
    kinds: [
      NotificationKind.CUSTOMER_REPLY,
      NotificationKind.APPOINTMENT_IMMINENT,
      NotificationKind.CUSTOMER_ARRIVED,
      NotificationKind.APPROVAL_DECIDED,
    ],
  },
  {
    label: "Importantes",
    description: "Para el día.",
    kinds: [
      NotificationKind.DAILY_ACTIONS_READY,
      NotificationKind.FOLLOWUP_OVERDUE,
      NotificationKind.WISHLIST_BACK_IN_STOCK,
      NotificationKind.WISHLIST_PRICE_DROP,
      NotificationKind.RESERVATION_EXPIRING,
      NotificationKind.MESSAGE_READ,
    ],
  },
  {
    label: "Útiles",
    description: "Bueno saberlo.",
    kinds: [
      NotificationKind.BIRTHDAY_TODAY,
      NotificationKind.SAMPLE_FOLLOWUP_DUE,
      NotificationKind.DORMANT_CUSTOMER,
      NotificationKind.ABANDONED_CART,
      NotificationKind.REPLENISHMENT_DUE,
      NotificationKind.BA_RATING_RECEIVED,
      NotificationKind.NEW_CUSTOMER_ASSIGNED,
    ],
  },
];
