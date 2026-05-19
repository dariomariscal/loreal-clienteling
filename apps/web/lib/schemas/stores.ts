import { z } from "zod";
import { STORE_CHAINS } from "@loreal/contracts";

export const createStoreSchema = z.object({
  code: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  chain: z.enum(STORE_CHAINS as [string, ...string[]]),
  zoneId: z.string().uuid().optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  municipalityId: z.string().length(5).optional(),
  postcode: z.string().max(10).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  brandIds: z.array(z.string().uuid()).optional(),
});

export const updateStoreSchema = createStoreSchema.partial();
