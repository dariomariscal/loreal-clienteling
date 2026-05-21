import type { SeedStore } from "../types";

export const SEED_STORES_COL: SeedStore[] = [
  {
    code: "LIV-COL-COLIMA",
    displayName: "Liverpool Colima",
    chain: "liverpool",
    address:
      "3er Anillo Periférico Ote. 301, Las Primaveras, 28040 Colima, Colima",
    geocodeQuery: "Liverpool Colima, Colima",
    city: "Colima",
    state: "Colima",
    district: "Las Primaveras",
    postcode: "28040",
    phone: "3123162300",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
  {
    code: "LIV-COL-MANZANILLO",
    displayName: "Liverpool Express Manzanillo",
    chain: "liverpool",
    address:
      "Blvd. Miguel de la Madrid 3275, Locales A18 y A19, Playa Azul, 28218 Manzanillo, Colima",
    geocodeQuery: "Liverpool Manzanillo, Manzanillo, Colima",
    city: "Manzanillo",
    state: "Colima",
    district: "Playa Azul",
    postcode: "28218",
    phone: "3141130851",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
    },
    brandCodes: ["LANCOME", "YSL"],
  },
];
