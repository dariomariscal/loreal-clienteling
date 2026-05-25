import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────

export interface BeautyProfile {
  id: string;
  customerId: string;
  skinType: string | null;
  skinTone: string | null;
  undertone: string | null;
  fitzpatrickScale: string | null;
  skinConcerns: string[] | null;
  preferredIngredients: string[] | null;
  avoidedIngredients: string[] | null;
  hairType: string | null;
  hairTexture: string | null;
  hairColorCurrent: string | null;
  fragranceFamilies: string[] | null;
  makeupPreferences: unknown;
  interests: string[] | null;
  createdAt: string;
  updatedAt: string;
  shades?: ShadeMatch[];
}

export interface ShadeMatch {
  id: string;
  beautyProfileId: string;
  category: string;
  brandId: string;
  productId: string;
  shadeCode: string;
  capturedAt: string;
  capturedByUserId: string;
  productTitle: string | null;
  brandName: string | null;
  swatchHex: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  channel: string;
  sourceName: string | null;
  externalOrderId: string | null;
  currency: string;
  /** Numeric columns arrive as strings from Drizzle to preserve precision. */
  subtotalPrice: string;
  totalTax: string;
  totalDiscounts: string;
  totalShipping: string;
  totalPrice: string;
  financialStatus: string;
  fulfillmentStatus: string;
  attributedUserId: string | null;
  attributionSource: string | null;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderLineItem[];
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  productId: string;
  sku: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
  price: string;
  totalDiscount: string;
}

export interface Recommendation {
  id: string;
  customerId: string;
  productId: string;
  recommendedByUserId: string;
  storeId: string;
  recommendedAt: string;
  source: string;
  aiReasoning: string | null;
  notes: string | null;
  visitPurpose: string | null;
  isConverted: boolean;
  convertedOrderId: string | null;
}

export interface Sample {
  id: string;
  customerId: string;
  productId: string;
  deliveredByUserId: string;
  storeId: string;
  deliveredAt: string;
  isConverted: boolean;
  convertedOrderId: string | null;
}

/**
 * Message row as returned by the API. Mirrors the DB shape in
 * @loreal/database, but timestamps land as ISO strings (JSON serialization),
 * not Date objects — the contract type uses Date because it's the modeled
 * shape, the wire shape is string.
 */
export interface Message {
  id: string;
  customerId: string;
  sentByUserId: string | null;
  direction: "outbound" | "inbound";
  channel: "whatsapp" | "sms" | "email";
  status:
    | "queued"
    | "sending"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "received";
  fromAddress: string | null;
  toAddress: string | null;
  providerMessageId: string | null;
  templateId: string | null;
  subject: string | null;
  body: string;
  campaignType: string | null;
  failureReason: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface Consent {
  id: string;
  customerId: string;
  type: string;
  version: string;
  acceptedAt: string;
  revokedAt: string | null;
  source: string;
  ipAddress: string | null;
  userAgent: string | null;
  /** Object-storage URL for the signature PNG. Only set for privacy_notice consents. */
  signatureUrl: string | null;
  /** Set when a double-opt-in channel (e.g. WhatsApp) confirms the consent. */
  confirmedAt: string | null;
  createdAt: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const detailKeys = {
  beauty: (id: string) => ["customers", id, "beauty-profile"] as const,
  orders: (id: string) => ["customers", id, "orders"] as const,
  recommendations: (id: string) => ["customers", id, "recommendations"] as const,
  samples: (id: string) => ["customers", id, "samples"] as const,
  messages: (id: string) => ["customers", id, "messages"] as const,
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
    }) => api.post<ShadeMatch>(`/customers/${customerId}/shades`, data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: detailKeys.beauty(customerId) }),
  });
}

// ── Orders ─────────────────────────────────────────────────────────

export function useCustomerOrders(customerId: string) {
  return useQuery({
    queryKey: detailKeys.orders(customerId),
    queryFn: () =>
      api.get<Order[]>(`/customers/${customerId}/orders`),
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

// ── Messages ───────────────────────────────────────────────────────

export function useCustomerMessages(customerId: string) {
  return useQuery({
    queryKey: detailKeys.messages(customerId),
    queryFn: () =>
      api.get<Message[]>(
        `/customers/${customerId}/messages`,
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

// ── Order mutation ─────────────────────────────────────────────────

export interface CreateOrderLineItem {
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      customerId: string;
      sourceName: string;
      items: CreateOrderLineItem[];
      totalPrice: number;
      externalOrderId?: string;
    }) => api.post<Order>("/orders", data),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: detailKeys.orders(customerId) });
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
      visitPurpose?: string;
      notes?: string;
      aiReasoning?: string;
    }) => api.post<Recommendation>("/recommendations", data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: detailKeys.recommendations(customerId) }),
  });
}
