import { Platform, type TextStyle } from "react-native";

// SF Pro on iOS = no fontFamily needed. iOS supports fractional weights
// like '540'; Android does not, so we map to the closest standard weight
// via Platform.select where it matters.
const sfPro = Platform.select({ ios: undefined, default: "System" });

// iOS supports fractional weights ("540") that the RN types do not list;
// we cast so the platform-correct value flows through at runtime.
const weight = (ios: string, android: TextStyle["fontWeight"]) =>
  (Platform.OS === "ios" ? ios : android) as TextStyle["fontWeight"];

// Text recipes — match BA shell type ramp.
// letterSpacing in RN is in points (not em). For body (15px) the web's
// -0.011em ≈ -0.16pt; we round to readable values.
export const typography = {
  // Display / hero (sign-in headline, "Hoy" view title)
  display: {
    fontFamily: sfPro,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    fontWeight: weight("600", "700"),
  } satisfies TextStyle,

  // Page title (ViewHeader)
  title: {
    fontFamily: sfPro,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: weight("600", "700"),
  } satisfies TextStyle,

  // Body (rows, cards)
  body: {
    fontFamily: sfPro,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontWeight: weight("400", "400"),
  } satisfies TextStyle,

  // Body medium (row primary text)
  bodyMedium: {
    fontFamily: sfPro,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontWeight: weight("540", "500"),
  } satisfies TextStyle,

  // Small / metadata
  small: {
    fontFamily: sfPro,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.05,
    fontWeight: weight("400", "400"),
  } satisfies TextStyle,

  smallMedium: {
    fontFamily: sfPro,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.05,
    fontWeight: weight("540", "500"),
  } satisfies TextStyle,

  // Caption / timestamp
  caption: {
    fontFamily: sfPro,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: weight("400", "400"),
  } satisfies TextStyle,

  // Eyebrow — uppercased, tracked (sidebar section headers)
  eyebrow: {
    fontFamily: sfPro,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    fontWeight: weight("600", "600"),
    textTransform: "uppercase",
  } satisfies TextStyle,

  // Numeric (KPI values, time pills)
  numeric: {
    fontFamily: sfPro,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    fontWeight: weight("600", "700"),
    fontVariant: ["tabular-nums"],
  } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
