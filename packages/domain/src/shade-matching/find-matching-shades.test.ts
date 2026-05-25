import {
  findMatchingShades,
  ShadeMatchInput,
  ShadeRecord,
} from "./find-matching-shades";

function makeShade(overrides: Partial<ShadeRecord>): ShadeRecord {
  return {
    productId: "product-1",
    brandId: "brand-1",
    shadeCode: "N100",
    category: "foundation",
    skinTone: "medium",
    undertone: "neutral",
    ...overrides,
  };
}

function makeInput(overrides: Partial<ShadeMatchInput>): ShadeMatchInput {
  return {
    targetCategory: "foundation",
    customerSkinTone: "medium",
    customerUndertone: "warm",
    currentShades: [],
    availableShades: [],
    ...overrides,
  };
}

describe("findMatchingShades", () => {
  it("returns exact matches (tone + undertone) with score 100", () => {
    const results = findMatchingShades(
      makeInput({
        customerSkinTone: "medium",
        customerUndertone: "warm",
        availableShades: [
          makeShade({ shadeCode: "W300", skinTone: "medium", undertone: "warm" }),
        ],
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(100);
    expect(results[0].matchType).toBe("exact");
  });

  it("returns tone matches (same tone, different undertone) with score 70", () => {
    const results = findMatchingShades(
      makeInput({
        customerSkinTone: "medium",
        customerUndertone: "warm",
        availableShades: [
          makeShade({ shadeCode: "C300", skinTone: "medium", undertone: "cool" }),
        ],
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(70);
    expect(results[0].matchType).toBe("tone_match");
  });

  it("returns adjacent tone matches with matching undertone at score 50", () => {
    const results = findMatchingShades(
      makeInput({
        customerSkinTone: "medium",
        customerUndertone: "warm",
        availableShades: [
          makeShade({ shadeCode: "W200", skinTone: "light", undertone: "warm" }),
        ],
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(50);
    expect(results[0].matchType).toBe("adjacent");
  });

  it("returns adjacent tone without undertone match at score 30", () => {
    const results = findMatchingShades(
      makeInput({
        customerSkinTone: "medium",
        customerUndertone: "warm",
        availableShades: [
          makeShade({ shadeCode: "C200", skinTone: "light", undertone: "cool" }),
        ],
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(30);
  });

  it("does not match non-adjacent tones", () => {
    const results = findMatchingShades(
      makeInput({
        customerSkinTone: "fair",
        customerUndertone: "cool",
        availableShades: [
          makeShade({ shadeCode: "D500", skinTone: "deep", undertone: "cool" }),
        ],
      }),
    );

    expect(results).toHaveLength(0);
  });

  it("filters by target category", () => {
    const results = findMatchingShades(
      makeInput({
        targetCategory: "lipstick",
        customerSkinTone: "medium",
        customerUndertone: "warm",
        availableShades: [
          makeShade({ category: "foundation", skinTone: "medium", undertone: "warm" }),
          makeShade({ category: "lipstick", shadeCode: "R100", skinTone: "medium", undertone: "warm" }),
        ],
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].shade.category).toBe("lipstick");
  });

  it("filters by target brand when specified", () => {
    const results = findMatchingShades(
      makeInput({
        targetBrandId: "brand-lancome",
        availableShades: [
          makeShade({ brandId: "brand-lancome", shadeCode: "L300", skinTone: "medium", undertone: "warm" }),
          makeShade({ brandId: "brand-ysl", shadeCode: "Y300", skinTone: "medium", undertone: "warm" }),
        ],
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].shade.brandId).toBe("brand-lancome");
  });

  it("excludes shades the customer already owns", () => {
    const ownedShade = makeShade({
      productId: "p1",
      shadeCode: "W300",
      skinTone: "medium",
      undertone: "warm",
    });

    const results = findMatchingShades(
      makeInput({
        currentShades: [ownedShade],
        availableShades: [
          ownedShade,
          makeShade({ productId: "p2", shadeCode: "W301", skinTone: "medium", undertone: "warm" }),
        ],
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].shade.shadeCode).toBe("W301");
  });

  it("sorts results by score descending", () => {
    const results = findMatchingShades(
      makeInput({
        customerSkinTone: "medium",
        customerUndertone: "warm",
        availableShades: [
          makeShade({ shadeCode: "C200", skinTone: "light", undertone: "cool", productId: "p1" }),
          makeShade({ shadeCode: "W300", skinTone: "medium", undertone: "warm", productId: "p2" }),
          makeShade({ shadeCode: "N300", skinTone: "medium", undertone: "neutral", productId: "p3" }),
        ],
      }),
    );

    expect(results[0].score).toBe(100);
    expect(results[1].score).toBe(70);
    expect(results[2].score).toBe(30);
  });

  it("returns empty array when no shades are available", () => {
    const results = findMatchingShades(
      makeInput({ availableShades: [] }),
    );

    expect(results).toEqual([]);
  });
});
