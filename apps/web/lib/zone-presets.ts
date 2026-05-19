/**
 * Catálogo de zonas predefinidas para CDMX + Estado de México.
 *
 * - CDMX: agrupación de cuadrante (Centro / Norte / Sur / Oriente / Poniente)
 *   usada por gobierno de CDMX para temas operativos y de seguridad.
 * - EdoMex: zonas metropolitanas oficiales (CONAPO/INEGI) — Valle de México,
 *   Valle de Toluca, y "Otros" para municipios fuera de ambas.
 *
 * Al hacer click en una alcaldía/municipio del mapa, sugerimos crear la zona
 * a la que pertenece, con TODAS las alcaldías hermanas preseleccionadas. El
 * admin puede editar nombre, color y composición antes de guardar.
 *
 * IDs son INEGI 5-dígitos (state_code + municipio).
 */

export interface ZonePreset {
  code: string;
  displayName: string;
  color: string;
  /** INEGI municipality IDs that compose this preset. */
  municipalityIds: string[];
}

const CDMX_CENTRO: ZonePreset = {
  code: "CDMX-CENTRO",
  displayName: "CDMX Centro",
  color: "#B91C1C", // red
  municipalityIds: [
    "09014", // Benito Juárez
    "09015", // Cuauhtémoc
    "09016", // Miguel Hidalgo
    "09017", // Venustiano Carranza
  ],
};

const CDMX_NORTE: ZonePreset = {
  code: "CDMX-NORTE",
  displayName: "CDMX Norte",
  color: "#1D4ED8", // blue
  municipalityIds: [
    "09002", // Azcapotzalco
    "09005", // Gustavo A. Madero
  ],
};

const CDMX_PONIENTE: ZonePreset = {
  code: "CDMX-PONIENTE",
  displayName: "CDMX Poniente",
  color: "#D4AF37", // gold
  municipalityIds: [
    "09004", // Cuajimalpa de Morelos
    "09008", // La Magdalena Contreras
    "09010", // Álvaro Obregón
  ],
};

const CDMX_SUR: ZonePreset = {
  code: "CDMX-SUR",
  displayName: "CDMX Sur",
  color: "#047857", // emerald
  municipalityIds: [
    "09003", // Coyoacán
    "09009", // Milpa Alta
    "09012", // Tlalpan
    "09013", // Xochimilco
  ],
};

const CDMX_ORIENTE: ZonePreset = {
  code: "CDMX-ORIENTE",
  displayName: "CDMX Oriente",
  color: "#7C3AED", // violet
  municipalityIds: [
    "09006", // Iztacalco
    "09007", // Iztapalapa
    "09011", // Tláhuac
  ],
};

const EDOMEX_VALLE_MEXICO: ZonePreset = {
  code: "EDOMEX-VM",
  displayName: "EdoMex Valle de México",
  color: "#EA580C", // orange
  municipalityIds: [
    "15002", "15011", "15013", "15020", "15022", "15023", "15024", "15025",
    "15028", "15029", "15030", "15031", "15033", "15035", "15037", "15038",
    "15039", "15044", "15046", "15053", "15057", "15058", "15059", "15060",
    "15069", "15070", "15075", "15081", "15083", "15084", "15089", "15091",
    "15092", "15093", "15095", "15099", "15100", "15103", "15104", "15108",
    "15109", "15120", "15121", "15122", "15125",
  ],
};

const EDOMEX_VALLE_TOLUCA: ZonePreset = {
  code: "EDOMEX-VT",
  displayName: "EdoMex Valle de Toluca",
  color: "#1F2937", // slate
  municipalityIds: [
    "15005", "15018", "15027", "15051", "15054", "15055", "15062", "15067",
    "15072", "15073", "15076", "15087", "15090", "15106", "15115", "15118",
  ],
};

export const ZONE_PRESETS: readonly ZonePreset[] = [
  CDMX_CENTRO,
  CDMX_NORTE,
  CDMX_PONIENTE,
  CDMX_SUR,
  CDMX_ORIENTE,
  EDOMEX_VALLE_MEXICO,
  EDOMEX_VALLE_TOLUCA,
];

/** Find the preset that contains a given municipality ID, if any. */
export function findPresetForMunicipality(municipalityId: string): ZonePreset | null {
  return (
    ZONE_PRESETS.find((p) => p.municipalityIds.includes(municipalityId)) ?? null
  );
}
