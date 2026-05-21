import type { SeedStore } from "../types";

export const SEED_STORES_BCS: SeedStore[] = [
  {
    code: "LIV-BCS-LOS-CABOS-DUTYFREE",
    displayName: "Duty Free Los Cabos",
    chain: "liverpool",
    address:
      "Av. Lázaro Cárdenas 1501, Locales 30, 48 y 50, El Médano, 23450 Cabo San Lucas, B.C.S.",
    geocodeQuery: "Av. Lazaro Cardenas 1501, Cabo San Lucas",
    city: "Cabo San Lucas",
    state: "Baja California Sur",
    district: "El Médano",
    postcode: "23450",
    phone: "6241051726",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
  {
    code: "LIV-BCS-LA-PAZ",
    displayName: "Liverpool La Paz",
    chain: "liverpool",
    address:
      "Av. Agustín Olachea Lotes 7 y 8 s/n esq. Pino Pallas, Fidepaz, 23090 La Paz, B.C.S.",
    geocodeQuery: "Liverpool La Paz, La Paz, Baja California Sur",
    city: "La Paz",
    state: "Baja California Sur",
    district: "Fidepaz",
    postcode: "23090",
    phone: "6121751000",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
];
