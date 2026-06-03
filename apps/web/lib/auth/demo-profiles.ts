import type { UserRole } from "@loreal/contracts";

/**
 * Demo profile catalog used by the in-app role switcher.
 *
 * These credentials power the streaming-style "Cambiar de perfil" dialog
 * available from every sidebar during the demo. They live here — not in the
 * sign-in form — so the public login page stays free of seeded credentials
 * and a single source of truth feeds the switcher across all role shells.
 *
 * To gate this for production, check `isDemoModeEnabled()` from
 * `./demo-mode.ts` at the call site.
 */
export type DemoProfile = {
  role: UserRole;
  roleLabel: string;
  fullName: string;
  email: string;
  password: string;
  blurb: string;
};

export const DEMO_PROFILES: readonly DemoProfile[] = [
  {
    role: "national_retail_manager",
    roleLabel: "NRM",
    fullName: "Diana Nacional",
    email: "d.nacional@loreal.mx",
    password: "Loreal2026!Demo",
    blurb: "5 regiones · $33M",
  },
  {
    role: "admin",
    roleLabel: "Admin",
    fullName: "Admin Central",
    email: "admin@loreal.mx",
    password: "LorealAdmin2026",
    blurb: "Acceso total",
  },
  {
    role: "area_manager",
    roleLabel: "Area Manager",
    fullName: "Diego Puebla",
    email: "d.puebla@loreal.mx",
    password: "trWx=xPk59c^^!LP",
    blurb: "Centro · $18M",
  },
  {
    role: "counter_manager",
    roleLabel: "Counter Manager",
    fullName: "Juan Perez",
    email: "j.perez@loreal.mx",
    password: "M%7cs5Je&ML5i#VG",
    blurb: "Polanco · YSL",
  },
  {
    role: "beauty_advisor",
    roleLabel: "Beauty Advisor",
    fullName: "Ana Martinez",
    email: "a.martinez@loreal.mx",
    password: "cYe!_ePAwNuLAt!3",
    blurb: "Santa Fe · YSL",
  },
  {
    role: "beauty_advisor",
    roleLabel: "Beauty Advisor",
    fullName: "Emiliano Alvarez",
    email: "e.alvarez@loreal.mx",
    password: "mango-violin-roca-7392",
    blurb: "Santa Fe · YSL",
  },
  {
    role: "beauty_advisor",
    roleLabel: "Beauty Advisor",
    fullName: "Moy Nousairi",
    email: "m.nousairi@loreal.mx",
    password: "GyR^#MS$ma_#6P+W",
    blurb: "Polanco · Lancôme",
  },
];
