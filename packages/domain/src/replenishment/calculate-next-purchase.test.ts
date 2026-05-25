import {
  calculateNextPurchase,
  ReplenishmentInput,
} from "./calculate-next-purchase";

const BASE_DATE = new Date("2026-04-21");

function makeInput(
  overrides: Partial<ReplenishmentInput>,
): ReplenishmentInput {
  return {
    productId: "product-1",
    replenishmentDays: 90,
    orderHistory: [],
    now: BASE_DATE,
    ...overrides,
  };
}

describe("calculateNextPurchase", () => {
  it("returns null when no orders exist for the product", () => {
    const result = calculateNextPurchase(makeInput({}));
    expect(result).toBeNull();
  });

  it("calculates depletion date from single order using product estimate", () => {
    const result = calculateNextPurchase(
      makeInput({
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2026-02-01") },
        ],
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.estimatedDepletionDate).toEqual(new Date("2026-05-02"));
    expect(result!.averageIntervalDays).toBeNull();
  });

  it("calculates repurchase window (15 days before to 30 days after depletion)", () => {
    const result = calculateNextPurchase(
      makeInput({
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2026-02-01") },
        ],
      }),
    );

    expect(result!.windowStart).toEqual(new Date("2026-04-17"));
    expect(result!.windowEnd).toEqual(new Date("2026-06-01"));
  });

  it("correctly identifies when customer is in the repurchase window", () => {
    const result = calculateNextPurchase(
      makeInput({
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2026-02-01") },
        ],
      }),
    );

    // now=April 21, window starts April 17 — should be in window
    expect(result!.isInWindow).toBe(true);
    expect(result!.isPastWindow).toBe(false);
  });

  it("correctly identifies when customer is before the repurchase window", () => {
    const result = calculateNextPurchase(
      makeInput({
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2026-03-01") },
        ],
      }),
    );

    // Depletion: May 30, window starts May 15 — April 21 is before window
    expect(result!.isInWindow).toBe(false);
    expect(result!.isPastWindow).toBe(false);
  });

  it("correctly identifies when customer is past the repurchase window", () => {
    const result = calculateNextPurchase(
      makeInput({
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2025-10-01") },
        ],
      }),
    );

    // Depletion: Dec 30, window ends Jan 29 — April 21 is past window
    expect(result!.isPastWindow).toBe(true);
    expect(result!.isInWindow).toBe(false);
  });

  it("uses average historical interval when multiple orders exist", () => {
    const result = calculateNextPurchase(
      makeInput({
        replenishmentDays: 90,
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2025-10-01") },
          { productId: "product-1", processedAt: new Date("2025-12-01") },
          { productId: "product-1", processedAt: new Date("2026-02-01") },
        ],
      }),
    );

    // Intervals: Oct→Dec = ~61d, Dec→Feb = ~62d, avg ≈ 62d
    expect(result!.averageIntervalDays).toBe(62);
    // Depletion: Feb 1 + 62d = April 4
    // Window: March 20 to May 4
    expect(result!.isInWindow).toBe(true);
  });

  it("filters only orders for the specified product", () => {
    const result = calculateNextPurchase(
      makeInput({
        orderHistory: [
          { productId: "other-product", processedAt: new Date("2026-04-01") },
          { productId: "product-1", processedAt: new Date("2026-01-01") },
        ],
      }),
    );

    expect(result).not.toBeNull();
    // Should only consider product-1 order from Jan 1
    expect(result!.estimatedDepletionDate).toEqual(new Date("2026-04-01"));
  });

  it("calculates days until depletion correctly", () => {
    const result = calculateNextPurchase(
      makeInput({
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2026-03-01") },
        ],
      }),
    );

    // Depletion: May 30, now: April 21 → 39 days
    expect(result!.daysUntilDepletion).toBe(39);
  });

  it("returns negative days until depletion when past due", () => {
    const result = calculateNextPurchase(
      makeInput({
        replenishmentDays: 30,
        orderHistory: [
          { productId: "product-1", processedAt: new Date("2026-01-01") },
        ],
      }),
    );

    // Depletion: Jan 31, now: April 21 → negative
    expect(result!.daysUntilDepletion).toBeLessThan(0);
  });
});
