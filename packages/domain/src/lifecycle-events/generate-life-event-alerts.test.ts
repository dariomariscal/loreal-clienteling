import {
  generateLifeEventAlerts,
  CustomerForAlerts,
} from "./generate-life-event-alerts";
import type { ReplenishmentResult } from "../replenishment/calculate-next-purchase";

const BASE_DATE = new Date(2026, 3, 21); // April 21, 2026 in local time

function makeCustomer(
  overrides: Partial<CustomerForAlerts>,
): CustomerForAlerts {
  return {
    customerId: "customer-1",
    birthday: null,
    enrolledAt: new Date(2024, 5, 15),
    assignedToUserId: "ba-1",
    ...overrides,
  };
}

function makeReplenishment(
  overrides: Partial<ReplenishmentResult>,
): ReplenishmentResult {
  return {
    productId: "product-1",
    estimatedDepletionDate: new Date(2026, 3, 25),
    windowStart: new Date(2026, 3, 10),
    windowEnd: new Date(2026, 4, 25),
    isInWindow: true,
    isPastWindow: false,
    averageIntervalDays: null,
    daysUntilDepletion: 4,
    ...overrides,
  };
}

describe("generateLifeEventAlerts", () => {
  describe("birthday alerts", () => {
    it("generates alert when birthday is within 7 days", () => {
      const customer = makeCustomer({
        birthday: new Date(1990, 3, 25),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe("birthday");
      expect(alerts[0].daysUntil).toBe(4);
      expect(alerts[0].label).toContain("4 day");
    });

    it("generates alert on the exact birthday", () => {
      const customer = makeCustomer({
        birthday: new Date(1990, 3, 21),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].label).toBe("Today is her birthday");
      expect(alerts[0].daysUntil).toBe(0);
    });

    it("does not generate alert when birthday is more than 7 days away", () => {
      const customer = makeCustomer({
        birthday: new Date(1990, 4, 15),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);
      const birthdayAlerts = alerts.filter((a) => a.type === "birthday");

      expect(birthdayAlerts).toHaveLength(0);
    });

    it("does not generate alert when birthday is null", () => {
      const customer = makeCustomer({ birthday: null });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);
      const birthdayAlerts = alerts.filter((a) => a.type === "birthday");

      expect(birthdayAlerts).toHaveLength(0);
    });

    it("handles birthday that already passed this year (checks next year)", () => {
      const customer = makeCustomer({
        birthday: new Date(1990, 0, 15),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);
      const birthdayAlerts = alerts.filter((a) => a.type === "birthday");

      // Next occurrence is Jan 15 2027, far away
      expect(birthdayAlerts).toHaveLength(0);
    });

    it("uses singular 'day' for 1 day", () => {
      const customer = makeCustomer({
        birthday: new Date(1990, 3, 22),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);

      expect(alerts[0].label).toBe("Birthday in 1 day");
    });
  });

  describe("anniversary alerts", () => {
    it("generates alert when anniversary is within 7 days", () => {
      const customer = makeCustomer({
        enrolledAt: new Date(2024, 3, 25),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe("special_event");
      expect(alerts[0].label).toContain("2-year");
      expect(alerts[0].daysUntil).toBe(4);
    });

    it("generates alert on the exact anniversary date", () => {
      const customer = makeCustomer({
        enrolledAt: new Date(2025, 3, 21),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].label).toContain("Today marks 1 year as a customer");
    });

    it("does not generate alert for first-year customers", () => {
      const customer = makeCustomer({
        enrolledAt: new Date(2026, 0, 15),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);
      const anniversaryAlerts = alerts.filter(
        (a) => a.type === "special_event",
      );

      expect(anniversaryAlerts).toHaveLength(0);
    });
  });

  describe("replenishment alerts", () => {
    it("generates alert when product is in repurchase window", () => {
      const customer = makeCustomer({});
      const replenishment = makeReplenishment({
        isInWindow: true,
        daysUntilDepletion: 5,
      });

      const alerts = generateLifeEventAlerts(
        customer,
        [replenishment],
        BASE_DATE,
      );

      const repAlerts = alerts.filter((a) => a.type === "replenishment");
      expect(repAlerts).toHaveLength(1);
      expect(repAlerts[0].label).toContain("5 days");
    });

    it("generates alert for already depleted product", () => {
      const customer = makeCustomer({});
      const replenishment = makeReplenishment({
        isInWindow: true,
        daysUntilDepletion: -5,
      });

      const alerts = generateLifeEventAlerts(
        customer,
        [replenishment],
        BASE_DATE,
      );

      const repAlerts = alerts.filter((a) => a.type === "replenishment");
      expect(repAlerts[0].label).toBe("Product likely out of stock");
    });

    it("does not generate alert for products outside window", () => {
      const customer = makeCustomer({});
      const replenishment = makeReplenishment({ isInWindow: false });

      const alerts = generateLifeEventAlerts(
        customer,
        [replenishment],
        BASE_DATE,
      );

      const repAlerts = alerts.filter((a) => a.type === "replenishment");
      expect(repAlerts).toHaveLength(0);
    });

    it("generates multiple replenishment alerts for different products", () => {
      const customer = makeCustomer({});
      const replenishments = [
        makeReplenishment({ productId: "p1", isInWindow: true }),
        makeReplenishment({ productId: "p2", isInWindow: true }),
        makeReplenishment({ productId: "p3", isInWindow: false }),
      ];

      const alerts = generateLifeEventAlerts(
        customer,
        replenishments,
        BASE_DATE,
      );

      const repAlerts = alerts.filter((a) => a.type === "replenishment");
      expect(repAlerts).toHaveLength(2);
    });
  });

  describe("combined alerts", () => {
    it("generates birthday + anniversary + replenishment alerts together", () => {
      const customer = makeCustomer({
        birthday: new Date(1990, 3, 23),
        enrolledAt: new Date(2024, 3, 24),
      });
      const replenishment = makeReplenishment({ isInWindow: true });

      const alerts = generateLifeEventAlerts(
        customer,
        [replenishment],
        BASE_DATE,
      );

      expect(alerts).toHaveLength(3);
      expect(alerts.map((a) => a.type).sort()).toEqual([
        "birthday",
        "replenishment",
        "special_event",
      ]);
    });

    it("assigns correct advisor to all alerts", () => {
      const customer = makeCustomer({
        assignedToUserId: "ba-specific",
        birthday: new Date(1990, 3, 22),
      });

      const alerts = generateLifeEventAlerts(customer, [], BASE_DATE);

      expect(alerts[0].assignedToUserId).toBe("ba-specific");
    });
  });
});
