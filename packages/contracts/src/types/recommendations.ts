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
