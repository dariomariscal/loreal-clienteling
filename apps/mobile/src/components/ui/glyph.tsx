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
  | "sparkle"
  | "check"
  | "alert";

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
};
