import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  createWishlistSchema,
  updateWishlistSchema,
  shareWishlistSchema,
  wishlistItemInputSchema,
  updateWishlistItemSchema,
} from "@/lib/schemas/wishlists";

// ── Types ──────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  variantId: string | null;
  note: string | null;
  position: number;
  addedAt: string;
  /**
   * Enrichment joined server-side so the wishlist UI never round-trips per
   * row. Image resolution uses variant→product fallback (variants ship
   * without imageUrl today).
   */
  product: {
    id: string;
    title: string;
    category: string;
    subcategory: string | null;
    imageUrl: string | null;
    brand: { id: string; code: string; displayName: string };
  };
  variant: {
    id: string;
    sku: string;
    title: string;
    optionLabel: string | null;
    price: number;
    imageUrl: string | null;
    swatchHex: string | null;
  } | null;
}

/** Shape returned by POST /wishlists/:id/items — includes the dedup flag. */
export interface AddWishlistItemResult {
  id: string;
  wishlistId: string;
  productId: string;
  variantId: string | null;
  note: string | null;
  position: number;
  addedAt: string;
  alreadyExists: boolean;
}

export interface Wishlist {
  id: string;
  customerId: string;
  createdByUserId: string;
  name: string;
  kind: "wishlist" | "lookbook";
  description: string | null;
  sharedAt: string | null;
  sharedVia: "whatsapp" | "sms" | "email" | "link" | null;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistWithItems extends Wishlist {
  items: WishlistItem[];
}

export type CreateWishlistInput = z.infer<typeof createWishlistSchema>;
export type UpdateWishlistInput = z.infer<typeof updateWishlistSchema>;
export type ShareWishlistInput = z.infer<typeof shareWishlistSchema>;
export type WishlistItemInput = z.infer<typeof wishlistItemInputSchema>;
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemSchema>;

// ── Query keys ─────────────────────────────────────────────────────

const wishlistKeys = {
  byCustomer: (customerId: string) =>
    ["wishlists", "customer", customerId] as const,
  detail: (id: string) => ["wishlists", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useCustomerWishlists(customerId: string) {
  return useQuery({
    queryKey: wishlistKeys.byCustomer(customerId),
    queryFn: () =>
      api.get<WishlistWithItems[]>(`/customers/${customerId}/wishlists`),
    enabled: !!customerId,
  });
}

export function useWishlist(id: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(id),
    queryFn: () => api.get<WishlistWithItems>(`/wishlists/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWishlistInput) =>
      api.post<WishlistWithItems>("/wishlists", data),
    onSuccess: (created) => {
      qc.invalidateQueries({
        queryKey: wishlistKeys.byCustomer(created.customerId),
      });
    },
  });
}

export function useUpdateWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateWishlistInput) =>
      api.patch<Wishlist>(`/wishlists/${id}`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: wishlistKeys.detail(updated.id) });
      qc.invalidateQueries({
        queryKey: wishlistKeys.byCustomer(updated.customerId),
      });
    },
  });
}

export function useDeleteWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; customerId?: string }) =>
      api.delete<{ id: string; deleted: true }>(`/wishlists/${id}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["wishlists"] });
      if (vars.customerId) {
        qc.invalidateQueries({
          queryKey: wishlistKeys.byCustomer(vars.customerId),
        });
      }
    },
  });
}

export function useShareWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & ShareWishlistInput) =>
      api.post<Wishlist>(`/wishlists/${id}/share`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: wishlistKeys.detail(updated.id) });
    },
  });
}

export function useAddWishlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      wishlistId,
      ...data
    }: { wishlistId: string } & WishlistItemInput) =>
      api.post<AddWishlistItemResult>(`/wishlists/${wishlistId}/items`, data),
    onSuccess: (_item, vars) => {
      // Invalidate both the per-wishlist detail and the customer-scoped list
      // so the WishlistSection refetches the enriched items without the BA
      // having to reload.
      qc.invalidateQueries({ queryKey: wishlistKeys.detail(vars.wishlistId) });
      qc.invalidateQueries({ queryKey: ["wishlists", "customer"] });
    },
  });
}

export function useUpdateWishlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      wishlistId,
      itemId,
      ...data
    }: { wishlistId: string; itemId: string } & UpdateWishlistItemInput) =>
      api.patch<WishlistItem>(
        `/wishlists/${wishlistId}/items/${itemId}`,
        data,
      ),
    onSuccess: (_item, vars) => {
      qc.invalidateQueries({ queryKey: wishlistKeys.detail(vars.wishlistId) });
    },
  });
}

export function useRemoveWishlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      wishlistId,
      itemId,
    }: {
      wishlistId: string;
      itemId: string;
    }) =>
      api.delete<{ id: string; deleted: true }>(
        `/wishlists/${wishlistId}/items/${itemId}`,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: wishlistKeys.detail(vars.wishlistId) });
    },
  });
}
