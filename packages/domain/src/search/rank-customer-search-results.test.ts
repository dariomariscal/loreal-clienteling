import {
  rankCustomerSearchResults,
  CustomerSearchRecord,
} from "./rank-customer-search-results";

const BASE_DATE = new Date("2026-04-21");
const SEARCHING_USER = "ba-1";

function makeCustomer(
  overrides: Partial<CustomerSearchRecord>,
): CustomerSearchRecord {
  return {
    customerId: "customer-1",
    firstName: "María",
    lastName: "García",
    lastInteractionAt: null,
    lastOrderAt: null,
    assignedToUserId: null,
    lifecycleStage: "returning",
    textMatchScore: 80,
    ...overrides,
  };
}

describe("rankCustomerSearchResults", () => {
  it("ranks by text match score when all else is equal", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({ customerId: "c1", textMatchScore: 60 }),
        makeCustomer({ customerId: "c2", textMatchScore: 90 }),
        makeCustomer({ customerId: "c3", textMatchScore: 75 }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    expect(results[0].customer.customerId).toBe("c2");
    expect(results[1].customer.customerId).toBe("c3");
    expect(results[2].customer.customerId).toBe("c1");
  });

  it("boosts customers assigned to the searching advisor", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({
          customerId: "c1",
          textMatchScore: 80,
          assignedToUserId: SEARCHING_USER,
        }),
        makeCustomer({
          customerId: "c2",
          textMatchScore: 90,
          assignedToUserId: "other-ba",
        }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    // c1 gets +30 affinity bonus: 80 + 30 + 10 = 120
    // c2: 90 + 10 = 100
    expect(results[0].customer.customerId).toBe("c1");
  });

  it("adds recency bonus for recent interactions", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({
          customerId: "c1",
          textMatchScore: 80,
          lastInteractionAt: new Date("2026-04-20"), // 1 day ago
        }),
        makeCustomer({
          customerId: "c2",
          textMatchScore: 80,
          lastInteractionAt: null,
        }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    expect(results[0].customer.customerId).toBe("c1");
    expect(results[0].finalScore).toBeGreaterThan(results[1].finalScore);
  });

  it("adds order recency bonus", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({
          customerId: "c1",
          textMatchScore: 80,
          lastOrderAt: new Date("2026-04-15"), // 6 days ago
        }),
        makeCustomer({
          customerId: "c2",
          textMatchScore: 80,
          lastOrderAt: null,
        }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    expect(results[0].customer.customerId).toBe("c1");
  });

  it("weights VIP customers higher than other stages", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({
          customerId: "c-new",
          textMatchScore: 80,
          lifecycleStage: "new",
        }),
        makeCustomer({
          customerId: "c-vip",
          textMatchScore: 80,
          lifecycleStage: "vip",
        }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    expect(results[0].customer.customerId).toBe("c-vip");
  });

  it("weights at_risk customers higher than returning", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({
          customerId: "c-returning",
          textMatchScore: 80,
          lifecycleStage: "returning",
        }),
        makeCustomer({
          customerId: "c-at-risk",
          textMatchScore: 80,
          lifecycleStage: "at_risk",
        }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    expect(results[0].customer.customerId).toBe("c-at-risk");
  });

  it("returns empty array for empty input", () => {
    const results = rankCustomerSearchResults({
      results: [],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    expect(results).toEqual([]);
  });

  it("no recency bonus for interactions older than 30 days", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({
          customerId: "c1",
          textMatchScore: 80,
          lastInteractionAt: new Date("2026-03-01"),
        }),
        makeCustomer({
          customerId: "c2",
          textMatchScore: 80,
          lastInteractionAt: null,
        }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    // Both should have same lifecycle bonus, no interaction recency for c1
    expect(results[0].finalScore).toBe(results[1].finalScore);
  });

  it("combines all scoring factors correctly", () => {
    const results = rankCustomerSearchResults({
      results: [
        makeCustomer({
          customerId: "perfect",
          textMatchScore: 95,
          lastInteractionAt: new Date("2026-04-20"),
          lastOrderAt: new Date("2026-04-18"),
          assignedToUserId: SEARCHING_USER,
          lifecycleStage: "vip",
        }),
      ],
      searchingUserId: SEARCHING_USER,
      now: BASE_DATE,
    });

    // 95 (text) + ~24 (contact 1d ago) + ~14 (order 3d ago) + 30 (affinity) + 20 (VIP) ≈ 183
    expect(results[0].finalScore).toBeGreaterThan(150);
  });
});
