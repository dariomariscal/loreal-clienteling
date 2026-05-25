import { z } from "zod";

export const WISHLIST_KINDS = ["wishlist", "lookbook"] as const;
export const SHARE_CHANNELS = ["whatsapp", "sms", "email", "link"] as const;

export const wishlistItemInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
  position: z.number().int().min(0).optional(),
});

export const createWishlistSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1).max(200),
  kind: z.enum(WISHLIST_KINDS).optional(),
  description: z.string().max(1000).optional(),
  items: z.array(wishlistItemInputSchema).optional(),
});

export const updateWishlistSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

export const shareWishlistSchema = z.object({
  channel: z.enum(SHARE_CHANNELS),
});

export const updateWishlistItemSchema = z.object({
  note: z.string().max(500).optional(),
  position: z.number().int().min(0).optional(),
});
