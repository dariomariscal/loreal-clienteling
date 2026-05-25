/**
 * Department-store chain — the retail industry calls this a "banner".
 */
export const StoreBanner = {
  LIVERPOOL: "liverpool",
  PALACIO: "palacio",
  OWNED: "owned",
} as const;

export type StoreBanner = (typeof StoreBanner)[keyof typeof StoreBanner];

export const STORE_BANNERS = Object.values(StoreBanner);
