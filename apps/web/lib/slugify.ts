/**
 * Turns a display name into an uppercase code (Brand / Zone / Store `code`,
 * Product `sku`-style identifiers).
 *
 *   "Zona Centro"        → "ZONA-CENTRO"
 *   "Liverpool Polanco"  → "LIVERPOOL-POLANCO"
 *   "Lancôme"            → "LANCOME"
 */
export function slugifyCode(value: string, maxLength = 30): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength);
}
