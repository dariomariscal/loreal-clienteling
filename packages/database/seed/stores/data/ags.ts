import type { SeedStore } from "../types";

export const SEED_STORES_AGS: SeedStore[] = [
  {
    code: "LIV-AGS-ALTARIA",
    displayName: "Liverpool Ags. Altaria",
    chain: "liverpool",
    address:
      "Blvd. a Zacatecas 851, Centro Comercial Altaria, Trojes de Alonso, 20116 Aguascalientes, Ags.",
    geocodeQuery: "Centro Comercial Altaria, Aguascalientes",
    city: "Aguascalientes",
    state: "Aguascalientes",
    district: "Trojes de Alonso",
    postcode: "20116",
    phone: "4491393400",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
      clickCollect: { "mon-sun": "11:00-21:00" },
      access: "Entrada por Playa y viaje",
    },
    brandCodes: ["LANCOME", "YSL"],
  },
  {
    code: "LIV-AGS-VILLASUNCION",
    displayName: "Liverpool Aguascalientes Villasunción",
    chain: "liverpool",
    address:
      "Av. Mahatma Gandhi s/n, Centro Comercial Villa Asunción, Pilar Blanco, 20280 Aguascalientes, Ags.",
    geocodeQuery: "Centro Comercial Villa Asuncion, Aguascalientes",
    city: "Aguascalientes",
    state: "Aguascalientes",
    district: "Pilar Blanco",
    postcode: "20280",
    phone: "4499104900",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
      clickCollect: { "mon-sun": "11:00-21:00" },
      access: "Entrada por PB, Depto. de caballeros",
    },
    brandCodes: ["LANCOME", "YSL"],
  },
];
