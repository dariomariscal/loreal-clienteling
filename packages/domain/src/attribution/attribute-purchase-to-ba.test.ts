import {
  attributePurchaseToBa,
  AttributionInput,
} from "./attribute-purchase-to-ba";

const BASE_DATE = new Date("2026-04-21T14:00:00Z");

function makeInput(overrides: Partial<AttributionInput>): AttributionInput {
  return {
    customerId: "customer-1",
    orderedProductIds: ["product-1"],
    processedAt: BASE_DATE,
    assignedToUserId: null,
    lastInteractionAt: null,
    activeRecommendations: [],
    now: BASE_DATE,
    ...overrides,
  };
}

describe("attributePurchaseToBa", () => {
  describe("Rule 1: active recommendation within 30 days", () => {
    it("attributes to advisor who recommended the ordered product", () => {
      const result = attributePurchaseToBa(
        makeInput({
          activeRecommendations: [
            {
              recommendedByUserId: "ba-1",
              productId: "product-1",
              recommendedAt: new Date("2026-04-10T10:00:00Z"),
              recommendationId: "rec-1",
            },
          ],
        }),
      );

      expect(result.attributedUserId).toBe("ba-1");
      expect(result.attributionSource).toBe("active_recommendation");
      expect(result.matchedRecommendationId).toBe("rec-1");
    });

    it("ignores recommendations older than 30 days", () => {
      const result = attributePurchaseToBa(
        makeInput({
          activeRecommendations: [
            {
              recommendedByUserId: "ba-1",
              productId: "product-1",
              recommendedAt: new Date("2026-03-01T10:00:00Z"),
              recommendationId: "rec-1",
            },
          ],
        }),
      );

      expect(result.attributedUserId).toBeNull();
    });

    it("ignores recommendations for different products", () => {
      const result = attributePurchaseToBa(
        makeInput({
          activeRecommendations: [
            {
              recommendedByUserId: "ba-1",
              productId: "other-product",
              recommendedAt: new Date("2026-04-15T10:00:00Z"),
              recommendationId: "rec-1",
            },
          ],
        }),
      );

      expect(result.attributedUserId).toBeNull();
    });

    it("picks the most recent recommendation when multiple match", () => {
      const result = attributePurchaseToBa(
        makeInput({
          activeRecommendations: [
            {
              recommendedByUserId: "ba-1",
              productId: "product-1",
              recommendedAt: new Date("2026-04-05T10:00:00Z"),
              recommendationId: "rec-1",
            },
            {
              recommendedByUserId: "ba-2",
              productId: "product-1",
              recommendedAt: new Date("2026-04-18T10:00:00Z"),
              recommendationId: "rec-2",
            },
          ],
        }),
      );

      expect(result.attributedUserId).toBe("ba-2");
      expect(result.matchedRecommendationId).toBe("rec-2");
    });

    it("matches any of the ordered products", () => {
      const result = attributePurchaseToBa(
        makeInput({
          orderedProductIds: ["product-1", "product-2", "product-3"],
          activeRecommendations: [
            {
              recommendedByUserId: "ba-1",
              productId: "product-3",
              recommendedAt: new Date("2026-04-15T10:00:00Z"),
              recommendationId: "rec-1",
            },
          ],
        }),
      );

      expect(result.attributedUserId).toBe("ba-1");
    });
  });

  describe("Rule 2: last consultation within 7 days", () => {
    it("attributes to assigned advisor when interaction was within window", () => {
      const result = attributePurchaseToBa(
        makeInput({
          assignedToUserId: "ba-3",
          lastInteractionAt: new Date("2026-04-21T06:00:00Z"),
        }),
      );

      expect(result.attributedUserId).toBe("ba-3");
      expect(result.attributionSource).toBe("last_consultation");
      expect(result.matchedRecommendationId).toBeNull();
    });

    it("attributes when interaction was a few days ago (still in window)", () => {
      const result = attributePurchaseToBa(
        makeInput({
          assignedToUserId: "ba-3",
          // 3 days before processedAt — well inside the 7-day window
          lastInteractionAt: new Date("2026-04-18T14:00:00Z"),
        }),
      );

      expect(result.attributedUserId).toBe("ba-3");
      expect(result.attributionSource).toBe("last_consultation");
    });

    it("does not attribute if interaction was more than 7 days ago", () => {
      const result = attributePurchaseToBa(
        makeInput({
          assignedToUserId: "ba-3",
          // 9 days before processedAt
          lastInteractionAt: new Date("2026-04-12T10:00:00Z"),
        }),
      );

      expect(result.attributedUserId).toBeNull();
    });

    it("does not attribute if assignedToUserId is null", () => {
      const result = attributePurchaseToBa(
        makeInput({
          assignedToUserId: null,
          lastInteractionAt: new Date("2026-04-21T06:00:00Z"),
        }),
      );

      expect(result.attributedUserId).toBeNull();
    });
  });

  describe("priority: recommendation > consultation", () => {
    it("prefers active recommendation over recent consultation", () => {
      const result = attributePurchaseToBa(
        makeInput({
          assignedToUserId: "ba-consultation",
          lastInteractionAt: new Date("2026-04-21T10:00:00Z"),
          activeRecommendations: [
            {
              recommendedByUserId: "ba-recommendation",
              productId: "product-1",
              recommendedAt: new Date("2026-04-15T10:00:00Z"),
              recommendationId: "rec-1",
            },
          ],
        }),
      );

      expect(result.attributedUserId).toBe("ba-recommendation");
      expect(result.attributionSource).toBe("active_recommendation");
    });
  });

  describe("Rule 3: no attribution", () => {
    it("returns null when no rules match", () => {
      const result = attributePurchaseToBa(makeInput({}));

      expect(result.attributedUserId).toBeNull();
      expect(result.attributionSource).toBeNull();
      expect(result.matchedRecommendationId).toBeNull();
    });
  });
});
