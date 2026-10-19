import { describe, it, expect } from "vitest";
import { normalize } from "./guess";
import { CATEGORIES, CAPITAL_OF } from "./guess-categories";

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

describe("category data integrity", () => {
  for (const cat of CATEGORIES) {
    describe(cat.label, () => {
      it("has no two items that normalize to the same value", () => {
        const seen = new Map<string, string>();
        for (const item of cat.items) {
          const n = normalize(item);
          expect(seen.has(n), `dupe under normalize: "${item}" vs "${seen.get(n)}"`).toBe(false);
          seen.set(n, item);
        }
      });
      it("every alias key is already normalized and resolves to a real item", () => {
        for (const [key, val] of Object.entries(cat.aliases ?? {})) {
          expect(normalize(key), `alias key not normalized: "${key}"`).toBe(key);
          expect(cat.items, `alias target missing: "${val}"`).toContain(val);
        }
      });
      it("no item starts with 'The ' and none uses 'St.'", () => {
        for (const item of cat.items) {
          expect(item.startsWith("The "), `leading The: "${item}"`).toBe(false);
          expect(/\bSt\./.test(item), `uses St.: "${item}"`).toBe(false);
        }
      });
    });
  }

  it("Countries has exactly 195 items", () => {
    expect(byId.countries.items.length).toBe(195);
  });

  it("categories meet their minimum sizes (animals>=150, fruitveg>=130, sports>=150)", () => {
    expect(byId.animals.items.length).toBeGreaterThanOrEqual(150);
    expect(byId.fruitveg.items.length).toBeGreaterThanOrEqual(130);
    expect(byId.sports.items.length).toBeGreaterThanOrEqual(150);
  });

  it("every alias target exists in its own category (no cross-category leakage)", () => {
    for (const cat of CATEGORIES) {
      for (const [key, val] of Object.entries(cat.aliases ?? {})) {
        expect(
          cat.items,
          `alias "${key}" in ${cat.label} targets "${val}", which is not an item in ${cat.label}`
        ).toContain(val);
      }
    }
  });

  describe("Capitals (derived from CAPITAL_OF)", () => {
    it("every capital maps to a country present in Countries", () => {
      for (const country of Object.keys(CAPITAL_OF)) {
        expect(byId.countries.items, `unknown country: "${country}"`).toContain(country);
      }
    });
    it("has no duplicate capitals", () => {
      const caps = Object.values(CAPITAL_OF);
      expect(new Set(caps).size).toBe(caps.length);
    });
    it("excludes Israel and Palestine, which remain in Countries", () => {
      expect(CAPITAL_OF["Israel"]).toBeUndefined();
      expect(CAPITAL_OF["Palestine"]).toBeUndefined();
      expect(byId.countries.items).toContain("Israel");
      expect(byId.countries.items).toContain("Palestine");
    });
    it("Capitals items equal the values of CAPITAL_OF", () => {
      expect([...byId.capitals.items].sort()).toEqual([...Object.values(CAPITAL_OF)].sort());
    });
  });
});
