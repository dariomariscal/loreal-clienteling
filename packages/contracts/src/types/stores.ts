export interface StoreHours {
  /** Opening hours for the store itself. Keys are day ranges, e.g. "mon-sun". */
  store?: Record<string, string>;
  /** Click & Collect hours, when different from the store. */
  clickCollect?: Record<string, string>;
  /** Free-text access notes (e.g. "Entrada por Playa y viaje"). */
  access?: string;
}

export interface CreateStore {
  code: string;
  displayName: string;
  /** Department-store chain name (liverpool | palacio | owned). Retail term. */
  banner: string;
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
  phone?: string;
  hours?: StoreHours;
  brandIds?: string[];
}

export type UpdateStore = Partial<CreateStore>;
