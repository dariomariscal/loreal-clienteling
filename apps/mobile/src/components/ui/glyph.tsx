import * as React from "react";
import Svg, { Path, type SvgProps } from "react-native-svg";

import { useTheme } from "@/theme";

// Monoline glyph set — mirror of apps/web/components/ui/glyphs.tsx in
// stroke weight (1.5px) and silhouette. All glyphs render in a 24x24
// viewBox so sizes scale predictably.
//
// We deliberately don't pull lucide or any icon font: pixel-exact parity
// with the web set matters more than icon catalog breadth. New glyphs
// are added by hand here AND in the web file.

export type GlyphName =
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "arrowRight"
  | "chevronRight"
  | "sparkle"
  | "check"
  | "alert"
  | "home"
  | "users"
  | "calendar"
  | "grid"
  | "bookmark"
  | "message"
  | "task"
  | "store"
  | "team"
  | "user"
  | "signOut"
  | "phone"
  | "pin"
  | "shield"
  | "brand"
  | "clock"
  | "chart"
  | "star"
  | "theme"
  | "bell"
  | "globe"
  | "info"
  | "more"
  | "presenter";

interface GlyphProps extends Omit<SvgProps, "color"> {
  name: GlyphName;
  size?: number;
  color?: string;
}

export function Glyph({ name, size = 16, color, ...props }: GlyphProps) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.foregroundMuted;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      {PATHS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

const PATHS: Record<GlyphName, string[]> = {
  mail: [
    "M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z",
    "m4 7 8 6 8-6",
  ],
  lock: [
    "M7 11V8a5 5 0 0 1 10 0v3",
    "M5.5 11h13a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-6A1.5 1.5 0 0 1 5.5 11Z",
  ],
  eye: [
    "M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z",
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  ],
  eyeOff: [
    "m3 3 18 18",
    "M10.6 6.1A9.1 9.1 0 0 1 12 6c6 0 9.5 6 9.5 6a16.5 16.5 0 0 1-2.7 3.4",
    "M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.7-.3 3.8-.8",
    "M9.9 9.9a3 3 0 0 0 4.2 4.2",
  ],
  arrowRight: ["M5 12h14", "m13 6 6 6-6 6"],
  // Sparkle dot — the ONE AI signifier in the entire app.
  sparkle: [
    "M12 3v3",
    "M12 18v3",
    "M3 12h3",
    "M18 12h3",
    "M5.6 5.6 7.7 7.7",
    "M16.3 16.3l2.1 2.1",
    "M5.6 18.4 7.7 16.3",
    "M16.3 7.7l2.1-2.1",
  ],
  check: ["m5 13 4 4L19 7"],
  alert: [
    "M12 8v5",
    "M12 17h.01",
    "M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  ],
  chevronRight: ["m9 6 6 6-6 6"],
  home: [
    "m3 11 9-7 9 7",
    "M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9",
  ],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M22 21v-2a4 4 0 0 0-3-3.9",
    "M16 3.1a4 4 0 0 1 0 7.8",
  ],
  calendar: [
    "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
    "M16 3v4",
    "M8 3v4",
    "M4 10h16",
  ],
  grid: [
    "M4 4h7v7H4z",
    "M13 4h7v7h-7z",
    "M4 13h7v7H4z",
    "M13 13h7v7h-7z",
  ],
  bookmark: ["M6 4h12v17l-6-4-6 4V4Z"],
  message: [
    "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H12l-4 4v-4H6.5A2.5 2.5 0 0 1 4 14.5v-8Z",
  ],
  task: [
    "M9 11l2 2 4-4",
    "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
  ],
  store: [
    "M4 9h16l-1-5H5L4 9Z",
    "M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9",
    "M10 20v-6h4v6",
  ],
  team: [
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  ],
  user: [
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M4 21v-1a7 7 0 0 1 16 0v1",
  ],
  signOut: [
    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    "M16 17l5-5-5-5",
    "M21 12H9",
  ],
  phone: [
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z",
  ],
  pin: [
    "M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13Z",
    "M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  ],
  shield: [
    "M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z",
  ],
  brand: [
    "M5 5h6v6H5z",
    "M13 5h6v6h-6z",
    "M5 13h6v6H5z",
    "M13 13h6v6h-6z",
  ],
  clock: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "M12 7v5l3 2",
  ],
  chart: [
    "M4 20V4",
    "M4 20h16",
    "M8 16v-5",
    "M12 16V8",
    "M16 16v-3",
  ],
  star: [
    "m12 3 2.6 5.6 6 .6-4.5 4.2 1.3 6L12 16.7 6.6 19.4l1.3-6L3.4 9.2l6-.6L12 3Z",
  ],
  theme: [
    "M12 3a9 9 0 1 0 0 18 4 4 0 0 1 0-8 4 4 0 0 1 0-8 4 4 0 0 1 0-2Z",
  ],
  bell: [
    "M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16Z",
    "M10 20a2 2 0 0 0 4 0",
  ],
  globe: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "M3 12h18",
    "M12 3a14 14 0 0 1 0 18",
    "M12 3a14 14 0 0 0 0 18",
  ],
  info: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "M12 11v5",
    "M12 8h.01",
  ],
  more: [
    "M6 12h.01",
    "M12 12h.01",
    "M18 12h.01",
  ],
  presenter: [
    "M3 5h18v11H3z",
    "M8 21h8",
    "M12 16v5",
  ],
};
