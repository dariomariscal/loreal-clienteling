import type { SeedStore } from "../types";

export const SEED_STORES_BC: SeedStore[] = [
  {
    code: "LIV-BC-MEXICALI",
    displayName: "Liverpool Mexicali",
    chain: "liverpool",
    address:
      "Blvd. Adolfo López Mateos 202, José María Ramírez, 21100 Mexicali, B.C.",
    geocodeQuery: "Liverpool Mexicali, Mexicali, Baja California",
    city: "Mexicali",
    state: "Baja California",
    district: "José María Ramírez",
    postcode: "21100",
    phone: "6862004200",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
  {
    code: "LIV-BC-ENSENADA",
    displayName: "Liverpool Express Ensenada",
    chain: "liverpool",
    address:
      "Reforma y Las Rosas s/n, Local 4, Vista Hermosa, 22785 Ensenada, B.C.",
    geocodeQuery: "Liverpool Ensenada, Ensenada, Baja California",
    city: "Ensenada",
    state: "Baja California",
    district: "Vista Hermosa",
    postcode: "22785",
    phone: "6469789241",
    hours: {
      store: { "mon-sun": "10:00-22:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
  {
    code: "LIV-BC-TIJUANA-PENINSULA",
    displayName: "Liverpool Tijuana Península",
    chain: "liverpool",
    address:
      "Av. Vialidad Rápida Oriente 15000, Chapultepec Alamar, 22110 Tijuana, B.C.",
    geocodeQuery: "Centro Comercial Peninsula, Tijuana",
    city: "Tijuana",
    state: "Baja California",
    district: "Chapultepec Alamar",
    postcode: "22110",
    phone: "6646552800",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
];
