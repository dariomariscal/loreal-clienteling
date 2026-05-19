export interface CreateZone {
  code: string;
  displayName: string;
  /** Hex color, e.g. "#D4AF37". Defaults to L'Oréal gold server-side. */
  color?: string;
  /** Lucide icon name. Defaults to "map-pin" server-side. */
  icon?: string;
  /** INEGI codes of municipalities that compose this zone. */
  municipalityIds?: string[];
}

export type UpdateZone = Partial<CreateZone>;

export interface Municipality {
  id: string;
  stateCode: string;
  stateName: string;
  name: string;
}
