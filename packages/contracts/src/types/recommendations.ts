import type { RecommendationReasonSignals } from "./recommendation-engine";

export interface CreateRecommendation {
  customerId: string;
  productId: string;
  source: string;
  visitPurpose?: string;
  aiReasoning?: string;
  notes?: string;
}

export interface AiRecommendationRequest {
  customerId: string;
  context?: string;
}

/**
 * Shape returned by `GET /customers/:id/recommendations`. Includes the
 * denormalised product display fields so the UI never has to issue a
 * follow-up request per recommendation row, and the engine reason signals so
 * "why?" chips can render directly.
 */
export interface RecommendationListItem {
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
  reasonSignals: RecommendationReasonSignals | null;
  engineScore: number | null;
  product: {
    id: string;
    sku: string;
    title: string;
    brandName: string | null;
    price: string;
    images: string[];
  } | null;
}
