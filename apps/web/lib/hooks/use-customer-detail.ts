import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────

export interface BeautyProfile {
  id: string;
  customerId: string;
  skinType: string | null;
  skinTone: string | null;
  skinSubtone: string | null;
  skinConcerns: string[] | null;
  preferredIngredients: string[] | null;
  avoidedIngredients: string[] | null;
  fragrancePreferences: string[] | null;
  makeupPreferences: unknown;
  routineType: string | null;
  interests: string[] | null;
  createdAt: string;
  updatedAt: string;
  shades?: Shade[];
}

export interface Shade {
  id: string;
  beautyProfileId: string;
  category: string;
  brandId: string;
  productId: string;
  shadeCode: string;
  capturedAt: string;
  capturedByUserId: string;
  productName: string | null;
  brandName: string | null;
  swatchHex: string | null;
}

export interface Purchase {
  id: string;
  customerId: string;
  storeId: string;
  purchasedAt: string;
  totalAmount: string;
  posTransactionId: string | null;
  source: string;
  attributedBaUserId: string | null;
  attributionReason: string | null;
  createdAt: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: string;
}

export interface Recommendation {
  id: string;
  customerId: string;
  productId: string;
  baUserId: string;
  storeId: string;
  recommendedAt: string;
  source: string;
  aiReasoning: string | null;
  notes: string | null;
  visitReason: string | null;
  convertedToPurchase: boolean;
  conversionPurchaseId: string | null;
}

export interface Sample {
  id: string;
  customerId: string;
  productId: string;
  baUserId: string;
  storeId: string;
  deliveredAt: string;
  convertedToPurchase: boolean;
  conversionPurchaseId: string | null;
}

export interface Communication {
  id: string;
  customerId: string;
  sentByUserId: string;
  channel: string;
  templateId: string | null;
  subject: string | null;
  body: string;
  followupType: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  respondedAt: string | null;
  trackingLinkId: string | null;
}

export interface Consent {
  id: string;
  customerId: string;
  type: string;
  version: string | null;
  acceptedAt: string;
  revokedAt: string | null;
  source: string | null;
}

// ── Query keys ─────────────────────────────────────────────────────

const detailKeys = {
  beauty: (id: string) => ["customers", id, "beauty-profile"] as const,
  purchases: (id: string) => ["customers", id, "purchases"] as const,
  recommendations: (id: string) => ["customers", id, "recommendations"] as const,
  samples: (id: string) => ["customers", id, "samples"] as const,
  communications: (id: string) => ["customers", id, "communications"] as const,
  consents: (id: string) => ["customers", id, "consents"] as const,
};

// ── Beauty Profile ─────────────────────────────────────────────────

export function useBeautyProfile(customerId: string) {
  return useQuery({
    queryKey: detailKeys.beauty(customerId),
    queryFn: () =>
      api.get<BeautyProfile | null>(
        `/customers/${customerId}/beauty-profile`,
      ),
    enabled: !!customerId,
  });
}

export function useUpsertBeautyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...data
    }: { customerId: string } & Record<string, unknown>) =>
      api.put<BeautyProfile>(
        `/customers/${customerId}/beauty-profile`,
        data,
      ),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: detailKeys.beauty(customerId) }),
  });
}

export function useAddShade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...data
    }: {
      customerId: string;
      category: string;
      brandId: string;
      productId: string;
      shadeCode: string;
    }) => api.post<Shade>(`/customers/${customerId}/shades`, data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: detailKeys.beauty(customerId) }),
  });
}

// ── Purchases ──────────────────────────────────────────────────────

export function useCustomerPurchases(customerId: string) {
  return useQuery({
    queryKey: detailKeys.purchases(customerId),
    queryFn: () =>
      api.get<Purchase[]>(`/customers/${customerId}/purchases`),
    enabled: !!customerId,
  });
}

// ── Recommendations ────────────────────────────────────────────────

export function useCustomerRecommendations(customerId: string) {
  return useQuery({
    queryKey: detailKeys.recommendations(customerId),
    queryFn: () =>
      api.get<Recommendation[]>(
        `/customers/${customerId}/recommendations`,
      ),
    enabled: !!customerId,
  });
}

// ── Samples ────────────────────────────────────────────────────────

export function useCustomerSamples(customerId: string) {
  return useQuery({
    queryKey: detailKeys.samples(customerId),
    queryFn: () =>
      api.get<Sample[]>(`/customers/${customerId}/samples`),
    enabled: !!customerId,
  });
}

// ── Communications ─────────────────────────────────────────────────

export function useCustomerCommunications(customerId: string) {
  return useQuery({
    queryKey: detailKeys.communications(customerId),
    queryFn: () =>
      api.get<Communication[]>(
        `/customers/${customerId}/communications`,
      ),
    enabled: !!customerId,
  });
}

// ── Consents ───────────────────────────────────────────────────────

export function useCustomerConsents(customerId: string) {
  return useQuery({
    queryKey: detailKeys.consents(customerId),
    queryFn: () =>
      api.get<Consent[]>(`/customers/${customerId}/consents`),
    enabled: !!customerId,
  });
}

export function useGrantConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...data
    }: {
      customerId: string;
      type: string;
      version?: string;
      source?: string;
    }) => api.post<Consent>(`/customers/${customerId}/consents`, data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: detailKeys.consents(customerId) }),
  });
}

export function useRevokeConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      type,
    }: {
      customerId: string;
      type: string;
    }) => api.delete(`/customers/${customerId}/consents/${type}`),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: detailKeys.consents(customerId) }),
  });
}

// ── Purchase mutation ──────────────────────────────────────────────

export interface CreatePurchaseItem {
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      customerId: string;
      source: string;
      items: CreatePurchaseItem[];
      totalAmount: number;
      posTransactionId?: string;
    }) => api.post<Purchase>("/purchases", data),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: detailKeys.purchases(customerId) });
      qc.invalidateQueries({ queryKey: detailKeys.recommendations(customerId) });
      qc.invalidateQueries({ queryKey: ["customers", customerId] });
    },
  });
}

// ── Recommendation mutation ────────────────────────────────────────

export function useCreateRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      customerId: string;
      productId: string;
      source: string;
      visitReason?: string;
      notes?: string;
      aiReasoning?: string;
    }) => api.post<Recommendation>("/recommendations", data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: detailKeys.recommendations(customerId) }),
  });
}
