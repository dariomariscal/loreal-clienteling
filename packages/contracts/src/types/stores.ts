export interface CreateStore {
  code: string;
  displayName: string;
  chain: string;
  /** Manual override. When omitted, the server derives it from municipalityId. */
  zoneId?: string;
  address?: string;
  city?: string;
  state?: string;
  /** Alcaldía / colonia label from geocoding. Display-only. */
  district?: string;
  /** INEGI 5-digit code. Server may re-derive from lat/lng. */
  municipalityId?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  brandIds?: string[];
}

export type UpdateStore = Partial<CreateStore>;
