import type { UserRole } from "@loreal/contracts";

// ── Permission definitions ─────────────────────────────────────────
// Each key is a permission, value is the list of roles that have it.
// Add new permissions here — they propagate to `can()`, sidebar, and UI.

const PERMISSIONS = {
  // Brands
  "brand.create": ["admin"],
  "brand.edit": ["admin"],

  // Zones
  "zone.create": ["admin"],
  "zone.edit": ["admin"],

  // Stores
  "store.create": ["admin"],
  "store.edit": ["admin"],

  // Products
  "product.create": ["admin"],
  "product.edit": ["admin"],
  "product.availability": ["admin", "counter_manager"],

  // Users
  "user.manage": ["admin"],
  "user.view": ["counter_manager", "area_manager", "national_retail_manager", "admin"],

  // Customers
  "customer.create": ["beauty_advisor", "counter_manager"],
  "customer.edit": ["beauty_advisor", "counter_manager"],
  "customer.delete": ["admin"], // ARCO right to be forgotten

  // Appointments — agenda is BA-only
  "appointment.create": ["beauty_advisor"],
  "appointment.edit": ["beauty_advisor"],

  // Customer interactions — only the BA records what they did with the client.
  // Higher roles can view the history, not create entries.
  "purchase.create": ["beauty_advisor"],
  "recommendation.create": ["beauty_advisor"],
  "note.create": ["beauty_advisor"],
  "beauty.edit": ["beauty_advisor"],

  // Communications
  "communication.create": ["beauty_advisor"],
  "template.manage": ["admin", "national_retail_manager"],

  // Analytics — everyone above BA can see dashboards (scope is enforced server-side).
  "analytics.view": [
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ],

  // Configuration
  "config.manage": ["admin"],

  // Audit
  "audit.view": ["admin"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

// ── Helper ─────────────────────────────────────────────────────────

/**
 * Check if a user's role has a specific permission.
 *
 * Usage:
 *   {can(user.role, "brand.create") && <Button>Nueva marca</Button>}
 */
export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
