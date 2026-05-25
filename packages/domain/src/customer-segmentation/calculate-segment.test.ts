import { calculateSegment, SegmentationInput } from "./calculate-segment";

const BASE_DATE = new Date("2026-04-21");

function makeInput(overrides: Partial<SegmentationInput>): SegmentationInput {
  return {
    enrolledAt: new Date("2025-01-01"),
    orderCount12Months: 0,
    totalSpending12Months: 0,
    lastOrderAt: null,
    lastMessageAt: null,
    vipSpendingThreshold: 15000,
    now: BASE_DATE,
    ...overrides,
  };
}

describe("calculateSegment", () => {
  describe("new stage", () => {
    it("classifies customer enrolled less than 30 days ago with no orders", () => {
      const result = calculateSegment(
        makeInput({
          enrolledAt: new Date("2026-04-10"),
          orderCount12Months: 0,
        }),
      );
      expect(result.stage).toBe("new");
      expect(result.isActive).toBe(true);
    });

    it("classifies customer enrolled less than 30 days ago with 1 order", () => {
      const result = calculateSegment(
        makeInput({
          enrolledAt: new Date("2026-04-05"),
          orderCount12Months: 1,
          lastOrderAt: new Date("2026-04-10"),
        }),
      );
      expect(result.stage).toBe("new");
      expect(result.isActive).toBe(true);
    });
  });

  describe("vip stage", () => {
    it("classifies customer with 6+ orders in 12 months", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 7,
          lastOrderAt: new Date("2026-04-01"),
        }),
      );
      expect(result.stage).toBe("vip");
      expect(result.isActive).toBe(true);
    });

    it("classifies customer exceeding spending threshold", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 3,
          totalSpending12Months: 20000,
          lastOrderAt: new Date("2026-03-15"),
        }),
      );
      expect(result.stage).toBe("vip");
      expect(result.isActive).toBe(true);
      expect(result.rationale).toContain("VIP threshold");
    });

    it("does not classify as VIP when spending equals threshold exactly", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 3,
          totalSpending12Months: 15000,
          lastOrderAt: new Date("2026-03-15"),
        }),
      );
      expect(result.stage).not.toBe("vip");
    });
  });

  describe("returning stage", () => {
    it("classifies customer with 2-5 orders in 12 months", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 3,
          lastOrderAt: new Date("2026-03-01"),
        }),
      );
      expect(result.stage).toBe("returning");
      expect(result.isActive).toBe(true);
    });

    it("classifies customer at lower bound (2 orders)", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 2,
          lastOrderAt: new Date("2026-03-01"),
        }),
      );
      expect(result.stage).toBe("returning");
    });

    it("classifies customer at upper bound (5 orders)", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 5,
          lastOrderAt: new Date("2026-03-01"),
        }),
      );
      expect(result.stage).toBe("returning");
    });
  });

  describe("at_risk stage", () => {
    it("classifies customer with last order 120-365 days ago", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 1,
          lastOrderAt: new Date("2025-11-01"),
        }),
      );
      expect(result.stage).toBe("at_risk");
      expect(result.isActive).toBe(true);
    });

    it("classifies customer with last order >365 days ago as inactive", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 0,
          lastOrderAt: new Date("2025-01-01"),
        }),
      );
      expect(result.stage).toBe("at_risk");
      expect(result.isActive).toBe(false);
    });

    it("keeps at_risk active if recent outreach exists for >365d customer", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 0,
          lastOrderAt: new Date("2025-01-01"),
          lastMessageAt: new Date("2026-03-01"),
        }),
      );
      expect(result.stage).toBe("at_risk");
      expect(result.isActive).toBe(true);
    });

    it("classifies customer with no orders and enrolled >30 days ago", () => {
      const result = calculateSegment(
        makeInput({
          enrolledAt: new Date("2025-06-01"),
          orderCount12Months: 0,
          lastOrderAt: null,
        }),
      );
      expect(result.stage).toBe("at_risk");
    });
  });

  describe("edge cases", () => {
    it("VIP takes priority over returning (6 orders)", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 6,
          lastOrderAt: new Date("2026-04-01"),
        }),
      );
      expect(result.stage).toBe("vip");
    });

    it("at_risk takes priority over returning when last order is old", () => {
      const result = calculateSegment(
        makeInput({
          orderCount12Months: 3,
          lastOrderAt: new Date("2025-10-01"),
        }),
      );
      expect(result.stage).toBe("at_risk");
    });

    it("uses current date when now is not provided", () => {
      const result = calculateSegment({
        enrolledAt: new Date(),
        orderCount12Months: 0,
        totalSpending12Months: 0,
        lastOrderAt: null,
        lastMessageAt: null,
        vipSpendingThreshold: 15000,
      });
      expect(result.stage).toBe("new");
    });
  });
});
