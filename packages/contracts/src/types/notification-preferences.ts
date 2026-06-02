import type { NotificationKind } from "../enums/notification";

/**
 * One toggle row per (user, kind). Absence of a row means "use system
 * defaults"; the service resolves defaults on read so the UI always gets
 * a complete map of all kinds.
 */
export interface NotificationPreference {
  userId: string;
  kind: NotificationKind;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  /** HH:MM 24h, app-local time (America/Mexico_City). */
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * Used by the settings page to render every kind even when the user has no
 * row yet — `effective` reflects defaults merged with overrides.
 */
export interface NotificationPreferenceResolved {
  kind: NotificationKind;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  isDefault: boolean;
}

export interface UpsertNotificationPreference {
  kind: NotificationKind;
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}
