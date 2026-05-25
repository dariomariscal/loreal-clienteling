// L'Oréal BA shell — official-aligned palette.
//
// L'Oréal Groupe wordmark is pure black on white (the only colors L'Oréal
// publishes as canonical). For accents, we use Luxor Gold (#9D6D2F) —
// the dorado that appears on L'Oréal Paris premium packaging (Excellence,
// Préférence, Revitalift). This is the "premium L'Oréal" cue without
// going retail-loud like the red carmin.
//
// Neutrals stay warm-tinted (not pure gray) — the warm cast complements
// gold and reads more "beauty" than cool tech grays would.

export type Colors = {
  background: string;
  surface: string;
  card: string;
  popover: string;
  muted: string;
  mutedSoft: string;
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  accentSoft: string;
  border: string;
  borderSoft: string;
  input: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarMuted: string;
  sidebarActive: string;
  sidebarBorder: string;
  destructive: string;
  destructiveSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  ring: string;
};

export const lightColors: Colors = {
  // Surfaces
  background: "#FFFFFF",
  surface: "#FAF8F4", // warm near-white
  card: "#FFFFFF",
  popover: "#FFFFFF",
  muted: "#F4F1EA",
  mutedSoft: "#F8F5EE",

  // Foreground (deep near-black, not pure #000 — pure black is harsh on
  // long-form text; the L'Oréal wordmark itself stays pure black via
  // `primary` below)
  foreground: "#1A1820",
  foregroundMuted: "#6B6760",
  foregroundSubtle: "#9A968E",

  // Primary — pure L'Oréal corporate black (the one canonical color)
  primary: "#000000",
  primaryForeground: "#FFFFFF",

  // Secondary (warm light gray)
  secondary: "#F4F1EA",
  secondaryForeground: "#1A1820",

  // Accent — Luxor Gold (L'Oréal Paris premium packaging dorado).
  // Used with severe restraint: one accent per screen, AI sparkle, the
  // single primary CTA on key flows.
  accent: "#9D6D2F",
  accentForeground: "#FFFFFF",
  accentSoft: "#F5EBD8", // warm cream for AI callout backgrounds

  // Borders — subtle, hairline
  border: "#E8E3DA",
  borderSoft: "#F0EBE0",
  input: "#E0DAD0",

  // Sidebar (warm-gray dim — never the dark sidebar of the admin web,
  // BAs need the customer to win)
  sidebar: "#F2EEE5",
  sidebarForeground: "#1A1820",
  sidebarMuted: "#807A70",
  sidebarActive: "#E5DFD2",
  sidebarBorder: "#E5DFD2",

  // Feedback
  destructive: "#B12318",
  destructiveSoft: "#FBE9E7",
  success: "#3E8E5A",
  successSoft: "#E8F1EA",
  warning: "#C99A3B",
  warningSoft: "#FAF0DD",
  info: "#3A6FD8",
  infoSoft: "#E6EDFB",

  // Focus ring (Luxor Gold @ low alpha)
  ring: "rgba(157, 109, 47, 0.35)",
};

export const darkColors: Colors = {
  background: "#0E0D10",
  surface: "#16151A",
  card: "#1C1A20",
  popover: "#1C1A20",
  muted: "#26242C",
  mutedSoft: "#221F27",

  foreground: "#F2EFE8",
  foregroundMuted: "#9F9A92",
  foregroundSubtle: "#6B6760",

  // In dark mode "primary" inverts — buttons read as cream-on-black
  primary: "#F2EFE8",
  primaryForeground: "#0E0D10",

  secondary: "#26242C",
  secondaryForeground: "#F2EFE8",

  // Brighter gold for dark backgrounds (#9D6D2F is too muddy on dark)
  accent: "#C99551",
  accentForeground: "#0E0D10",
  accentSoft: "#3A2A14",

  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  input: "rgba(255,255,255,0.12)",

  sidebar: "#16151A",
  sidebarForeground: "#D9D4CB",
  sidebarMuted: "#827D74",
  sidebarActive: "#26242C",
  sidebarBorder: "rgba(255,255,255,0.08)",

  destructive: "#E04F3F",
  destructiveSoft: "rgba(224,79,63,0.12)",
  success: "#4FA66E",
  successSoft: "rgba(79,166,110,0.12)",
  warning: "#D9A94B",
  warningSoft: "rgba(217,169,75,0.14)",
  info: "#5489E0",
  infoSoft: "rgba(84,137,224,0.14)",

  ring: "rgba(201, 149, 81, 0.45)",
};
