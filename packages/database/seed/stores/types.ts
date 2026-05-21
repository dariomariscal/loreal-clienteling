import type { StoreHours } from "../../schema/stores";

export interface SeedStore {
  code: string;
  displayName: string;
  chain: "liverpool" | "palacio" | "owned";
  address: string;
  city?: string;
  state?: string;
  district?: string;
  postcode?: string;
  phone?: string;
  hours?: StoreHours;
  /**
   * Override the string sent to Nominatim. Use when the official postal
   * address is too granular and Nominatim returns no match — typically a
   * shorter "<Place name>, <city>" query works better.
   */
  geocodeQuery?: string;
  /** Skip geocoding when set. */
  lat?: number;
  lng?: number;
  /** Skip ST_Contains lookup when set. */
  municipalityId?: string;
  /** Resolved against `brands.code` and written to `brand_stores`. */
  brandCodes?: string[];
}
