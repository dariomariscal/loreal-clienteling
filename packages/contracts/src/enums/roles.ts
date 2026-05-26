/**
 * Operational roles for the clienteling platform.
 *
 * Names follow the official L'Oréal Luxe nomenclature documented in
 * `rfp-loreal-clienteling/10-roles-operativos.md`. Each role maps to a real
 * job title in the field organization:
 *
 *   beauty_advisor           → Beauty Advisor (Consejera de Belleza) — counter staff
 *   counter_manager          → Counter Manager / Business Manager — leads BAs at a single counter
 *   area_manager             → Multibrand Area Manager — supervises a zone for a whole division
 *   national_retail_manager  → National Retail Manager — leads retail for one division nationally
 *   admin                    → System administrator / Country GM-level access
 *
 * Scope hierarchy (low → high):
 *   beauty_advisor          : 1 store + 1 brand
 *   counter_manager         : 1 store + 1 brand
 *   area_manager            : 1 zone  + 1 division   (multi-brand inside its division)
 *   national_retail_manager : national + 1 division
 *   admin                   : national + every division
 */
export const UserRole = {
  BEAUTY_ADVISOR: "beauty_advisor",
  COUNTER_MANAGER: "counter_manager",
  AREA_MANAGER: "area_manager",
  NATIONAL_RETAIL_MANAGER: "national_retail_manager",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES = Object.values(UserRole);

/**
 * Beauty Advisor specialization. Does NOT alter permissions — just labels the
 * BA's area of expertise for routing (skin concerns → skincare expert) and
 * for displaying credentials in the UI.
 */
export const BeautyAdvisorSpecialty = {
  GENERALIST: "generalist",
  MAKEUP_ARTIST: "makeup_artist",
  SKINCARE_EXPERT: "skincare_expert",
  FRAGRANCE_SPECIALIST: "fragrance_specialist",
} as const;

export type BeautyAdvisorSpecialty =
  (typeof BeautyAdvisorSpecialty)[keyof typeof BeautyAdvisorSpecialty];

export const BEAUTY_ADVISOR_SPECIALTIES = Object.values(BeautyAdvisorSpecialty);

// ── Convenience predicates ─────────────────────────────────────────────────
// Used by services that want to ask "is this role at-or-above counter
// manager?" without listing every role literal. Centralized so the question
// "what does a manager see?" has one answer the codebase agrees on.

export function isBeautyAdvisor(role: string): boolean {
  return role === UserRole.BEAUTY_ADVISOR;
}

export function isCounterManager(role: string): boolean {
  return role === UserRole.COUNTER_MANAGER;
}

export function isAreaManager(role: string): boolean {
  return role === UserRole.AREA_MANAGER;
}

export function isNationalRetailManager(role: string): boolean {
  return role === UserRole.NATIONAL_RETAIL_MANAGER;
}

export function isAdmin(role: string): boolean {
  return role === UserRole.ADMIN;
}

/** Counter Manager or higher. Used to gate "manage this counter/store" reads. */
export function isCounterManagerOrAbove(role: string): boolean {
  return (
    role === UserRole.COUNTER_MANAGER ||
    role === UserRole.AREA_MANAGER ||
    role === UserRole.NATIONAL_RETAIL_MANAGER ||
    role === UserRole.ADMIN
  );
}

/** Area Manager or higher. Used to gate multi-store operations. */
export function isAreaManagerOrAbove(role: string): boolean {
  return (
    role === UserRole.AREA_MANAGER ||
    role === UserRole.NATIONAL_RETAIL_MANAGER ||
    role === UserRole.ADMIN
  );
}

/** National Retail Manager or higher. Used to gate national-scope reads. */
export function isNationalOrAbove(role: string): boolean {
  return (
    role === UserRole.NATIONAL_RETAIL_MANAGER || role === UserRole.ADMIN
  );
}

// ── Convenient role-set bundles (use with @Roles([...])) ───────────────────

/** Every operational role. */
export const ALL_ROLES: readonly string[] = USER_ROLES;

/** Counter-level roles (BA + Counter Manager). Used for "operates a counter". */
export const COUNTER_ROLES: readonly string[] = [
  UserRole.BEAUTY_ADVISOR,
  UserRole.COUNTER_MANAGER,
];

/** Roles allowed to write to customer records / register sales. */
export const FIELD_WRITE_ROLES: readonly string[] = [
  UserRole.BEAUTY_ADVISOR,
  UserRole.COUNTER_MANAGER,
];

/** Roles that can read across multiple stores/brands. */
export const MULTI_STORE_ROLES: readonly string[] = [
  UserRole.AREA_MANAGER,
  UserRole.NATIONAL_RETAIL_MANAGER,
  UserRole.ADMIN,
];
