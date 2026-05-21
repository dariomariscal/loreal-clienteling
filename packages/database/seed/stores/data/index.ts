import type { SeedStore } from "../types";
import { SEED_STORES_AGS } from "./ags";
import { SEED_STORES_BC } from "./bc";
import { SEED_STORES_BCS } from "./bcs";
import { SEED_STORES_CAM } from "./cam";
import { SEED_STORES_CDMX } from "./cdmx";
import { SEED_STORES_CHIH } from "./chih";
import { SEED_STORES_CHIS } from "./chis";
import { SEED_STORES_COA } from "./coa";
import { SEED_STORES_COL } from "./col";
import { SEED_STORES_MEX } from "./mex";

export const SEED_STORES: SeedStore[] = [
  ...SEED_STORES_AGS,
  ...SEED_STORES_BC,
  ...SEED_STORES_BCS,
  ...SEED_STORES_CAM,
  ...SEED_STORES_COA,
  ...SEED_STORES_COL,
  ...SEED_STORES_CHIS,
  ...SEED_STORES_CHIH,
  ...SEED_STORES_CDMX,
  ...SEED_STORES_MEX,
];
