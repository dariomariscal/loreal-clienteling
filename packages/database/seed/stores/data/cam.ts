import type { SeedStore } from "../types";

export const SEED_STORES_CAM: SeedStore[] = [
  {
    code: "LIV-CAM-CHAMPOTON",
    displayName: "Liverpool Express Champotón",
    chain: "liverpool",
    address: "Calle 34 No. 24, Centro, 24400 Champotón, Campeche",
    geocodeQuery: "Liverpool Champoton, Campeche",
    city: "Champotón",
    state: "Campeche",
    district: "Centro",
    postcode: "24400",
    phone: "9826881058",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
  {
    code: "LIV-CAM-GALERIAS",
    displayName: "Liverpool Galerías Campeche",
    chain: "liverpool",
    address:
      "Pedro Sainz de Baranda 1401, Ermita, 24000 Campeche, Campeche",
    geocodeQuery: "Galerias Campeche, Campeche",
    city: "Campeche",
    state: "Campeche",
    district: "Ermita",
    postcode: "24000",
    phone: "9818181300",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
  {
    code: "LIV-CAM-CIUDAD-DEL-CARMEN",
    displayName: "Liverpool Cd. del Carmen",
    chain: "liverpool",
    address:
      "Av. Corregidora 130, Aeropuerto, 24199 Ciudad del Carmen, Campeche",
    geocodeQuery: "Liverpool Ciudad del Carmen, Ciudad del Carmen, Campeche",
    city: "Ciudad del Carmen",
    state: "Campeche",
    district: "Aeropuerto",
    postcode: "24199",
    phone: "9383810100",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
      clickCollect: { "mon-sun": "10:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
];
