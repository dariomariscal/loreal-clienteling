import { rankProductRecommendations } from "./rank-product-recommendations";
import type {
  CustomerPreferenceSnapshot,
  ProductRankingMetadata,
  ProductRecommendationCandidate,
} from "@loreal/contracts";

function makeCustomer(
  overrides: Partial<CustomerPreferenceSnapshot> = {},
): CustomerPreferenceSnapshot {
  return {
    customerId: "customer-1",
    skinConcerns: [],
    preferredIngredients: [],
    avoidedIngredients: [],
    brandAffinity: {},
    averageOrderValue: 0,
    routineProductIds: [],
    purchasedProductIds: [],
    ...overrides,
  };
}

function makeProduct(
  overrides: Partial<ProductRankingMetadata> & { productId: string },
): ProductRankingMetadata {
  return {
    brandId: "brand-1",
    category: "skincare",
    productType: "Serum",
    price: 100,
    ingredients: [],
    targetConcerns: [],
    tags: [],
    hasStock: true,
    ...overrides,
  };
}

function metadataIndex(
  ...products: ProductRankingMetadata[]
): Record<string, ProductRankingMetadata> {
  return Object.fromEntries(products.map((p) => [p.productId, p]));
}

describe("rankProductRecommendations", () => {
  it("returns empty when no candidates", () => {
    const result = rankProductRecommendations({
      customer: makeCustomer(),
      candidates: [],
      productMetadata: {},
    });
    expect(result).toEqual([]);
  });

  it("hard-filters out-of-stock products", () => {
    const candidates: ProductRecommendationCandidate[] = [
      { productId: "p1", source: "semantic_match", score: 0.9 },
    ];
    const result = rankProductRecommendations({
      customer: makeCustomer(),
      candidates,
      productMetadata: metadataIndex(
        makeProduct({ productId: "p1", hasStock: false }),
      ),
    });
    expect(result).toEqual([]);
  });

  it("hard-filters products with avoided ingredients", () => {
    const candidates: ProductRecommendationCandidate[] = [
      { productId: "p1", source: "content_affinity", score: 1 },
    ];
    const result = rankProductRecommendations({
      customer: makeCustomer({ avoidedIngredients: ["fragrance"] }),
      candidates,
      productMetadata: metadataIndex(
        makeProduct({ productId: "p1", ingredients: ["fragrance", "water"] }),
      ),
    });
    expect(result).toEqual([]);
  });

  it("hard-filters products already purchased", () => {
    const candidates: ProductRecommendationCandidate[] = [
      { productId: "p1", source: "semantic_match", score: 0.9 },
    ];
    const result = rankProductRecommendations({
      customer: makeCustomer({ purchasedProductIds: ["p1"] }),
      candidates,
      productMetadata: metadataIndex(makeProduct({ productId: "p1" })),
    });
    expect(result).toEqual([]);
  });

  it("fuses multiple sources into a single ranked entry per product", () => {
    const candidates: ProductRecommendationCandidate[] = [
      { productId: "p1", source: "semantic_match", score: 0.8 },
      { productId: "p1", source: "lookalike_purchase", score: 0.5 },
    ];
    const [ranked] = rankProductRecommendations({
      customer: makeCustomer(),
      candidates,
      productMetadata: metadataIndex(makeProduct({ productId: "p1" })),
    });

    expect(ranked.productId).toBe("p1");
    expect(ranked.signals.semanticMatch).toBe(0.8);
    expect(ranked.signals.lookalikePurchase).toBe(0.5);
    expect(ranked.contributingSources.slice(0, 2)).toEqual([
      "semantic_match",
      "lookalike_purchase",
    ]);
  });

  it("boosts replenishment candidates above pure semantic matches", () => {
    const candidates: ProductRecommendationCandidate[] = [
      { productId: "p_semantic", source: "semantic_match", score: 0.9 },
      {
        productId: "p_replenish",
        source: "replenishment_due",
        score: 0.95,
        replenishmentDaysUntilDepletion: 3,
      },
    ];
    const ranked = rankProductRecommendations({
      customer: makeCustomer(),
      candidates,
      productMetadata: metadataIndex(
        makeProduct({ productId: "p_semantic" }),
        makeProduct({ productId: "p_replenish" }),
      ),
    });
    expect(ranked[0].productId).toBe("p_replenish");
    expect(ranked[0].signals.replenishmentDaysUntilDepletion).toBe(3);
  });

  it("rewards content affinity via skin-concern overlap", () => {
    const candidates: ProductRecommendationCandidate[] = [
      { productId: "p_match", source: "semantic_match", score: 0.5 },
      { productId: "p_generic", source: "semantic_match", score: 0.5 },
    ];
    const ranked = rankProductRecommendations({
      customer: makeCustomer({ skinConcerns: ["melasma", "dark_spots"] }),
      candidates,
      productMetadata: metadataIndex(
        makeProduct({
          productId: "p_match",
          targetConcerns: ["melasma", "dark_spots"],
        }),
        makeProduct({ productId: "p_generic", targetConcerns: ["dryness"] }),
      ),
    });
    expect(ranked[0].productId).toBe("p_match");
    expect(ranked[0].signals.contentAffinity).toBeGreaterThan(0);
  });

  it("penalises products already in the daily routine", () => {
    const candidates: ProductRecommendationCandidate[] = [
      { productId: "p_routine", source: "semantic_match", score: 0.9 },
      { productId: "p_new", source: "semantic_match", score: 0.85 },
    ];
    const ranked = rankProductRecommendations({
      customer: makeCustomer({ routineProductIds: ["p_routine"] }),
      candidates,
      productMetadata: metadataIndex(
        makeProduct({ productId: "p_routine" }),
        makeProduct({ productId: "p_new" }),
      ),
    });
    expect(ranked[0].productId).toBe("p_new");
  });

  it("respects the limit", () => {
    const candidates: ProductRecommendationCandidate[] = Array.from(
      { length: 12 },
      (_, i) => ({
        productId: `p${i}`,
        source: "semantic_match" as const,
        score: 0.9 - i * 0.05,
      }),
    );
    const metadata = metadataIndex(
      ...candidates.map((c) => makeProduct({ productId: c.productId })),
    );
    const ranked = rankProductRecommendations({
      customer: makeCustomer(),
      candidates,
      productMetadata: metadata,
      limit: 3,
    });
    expect(ranked).toHaveLength(3);
  });
});
