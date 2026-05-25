import type { GlyphName } from "@/components/ui";

// Canonical list of profile sub-sections. The master list renders these
// groups verbatim; the detail pane keys off `id` to pick the section view.

export type ProfileSectionId =
  | "personal"
  | "contact"
  | "security"
  | "store"
  | "brands"
  | "schedule"
  | "kpis"
  | "recognitions"
  | "theme"
  | "notifications"
  | "language";

export interface ProfileSectionDef {
  id: ProfileSectionId;
  label: string;
  icon: GlyphName;
  breadcrumbGroup: string;
}

export const PROFILE_GROUPS: Array<{
  eyebrow: string;
  items: ProfileSectionDef[];
}> = [
  {
    eyebrow: "Cuenta",
    items: [
      {
        id: "personal",
        label: "Información personal",
        icon: "user",
        breadcrumbGroup: "Cuenta",
      },
      {
        id: "contact",
        label: "Contacto",
        icon: "mail",
        breadcrumbGroup: "Cuenta",
      },
      {
        id: "security",
        label: "Seguridad y acceso",
        icon: "shield",
        breadcrumbGroup: "Cuenta",
      },
    ],
  },
  {
    eyebrow: "Trabajo",
    items: [
      {
        id: "store",
        label: "Tienda y zona",
        icon: "store",
        breadcrumbGroup: "Trabajo",
      },
      {
        id: "brands",
        label: "Marcas asignadas",
        icon: "brand",
        breadcrumbGroup: "Trabajo",
      },
      {
        id: "schedule",
        label: "Horario y disponibilidad",
        icon: "clock",
        breadcrumbGroup: "Trabajo",
      },
    ],
  },
  {
    eyebrow: "Desempeño",
    items: [
      {
        id: "kpis",
        label: "Mis KPIs del mes",
        icon: "chart",
        breadcrumbGroup: "Desempeño",
      },
      {
        id: "recognitions",
        label: "Reconocimientos",
        icon: "star",
        breadcrumbGroup: "Desempeño",
      },
    ],
  },
  {
    eyebrow: "Preferencias",
    items: [
      {
        id: "theme",
        label: "Tema (claro / oscuro)",
        icon: "theme",
        breadcrumbGroup: "Preferencias",
      },
      {
        id: "notifications",
        label: "Notificaciones",
        icon: "bell",
        breadcrumbGroup: "Preferencias",
      },
      {
        id: "language",
        label: "Idioma",
        icon: "globe",
        breadcrumbGroup: "Preferencias",
      },
    ],
  },
];

export function findSection(id: ProfileSectionId): ProfileSectionDef {
  for (const g of PROFILE_GROUPS) {
    const found = g.items.find((i) => i.id === id);
    if (found) return found;
  }
  // Fallback to first item — unreachable in practice.
  return PROFILE_GROUPS[0].items[0];
}

export function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}

export function roleLabel(role: string): string {
  switch (role) {
    case "ba":
      return "Beauty Advisor";
    case "manager":
      return "Manager de tienda";
    case "supervisor":
      return "Supervisor de zona";
    case "admin":
      return "Administrador";
    default:
      return role;
  }
}
