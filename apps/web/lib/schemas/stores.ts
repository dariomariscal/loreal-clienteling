import { z } from "zod";
import { STORE_BANNERS } from "@loreal/contracts";

const hoursMapSchema = z.record(z.string(), z.string()).optional();

export const storeHoursSchema = z.object({
  store: hoursMapSchema,
  clickCollect: hoursMapSchema,
  access: z.string().max(200).optional(),
});

export const createStoreSchema = z.object({
  code: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  banner: z.enum(STORE_BANNERS as [string, ...string[]]),
  zoneId: z.string().uuid().optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  municipalityId: z.string().length(5).optional(),
  postcode: z.string().max(10).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  phone: z.string().max(20).optional(),
  hours: storeHoursSchema.optional(),
  brandIds: z.array(z.string().uuid()).optional(),
});

export const updateStoreSchema = createStoreSchema.partial();
