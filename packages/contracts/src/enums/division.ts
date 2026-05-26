/**
 * L'Oréal global divisions. These are the four canonical business divisions
 * the field organization is structured around. Stable codes used both as URL
 * slugs and as the `code` column in the `divisions` table.
 */
export const DivisionCode = {
  LUXE: "luxe",
  CONSUMER: "consumer",
  ACTIVE: "active",
  PROFESSIONAL: "professional",
} as const;

export type DivisionCode = (typeof DivisionCode)[keyof typeof DivisionCode];

export const DIVISION_CODES = Object.values(DivisionCode);
