import { describe, it, expect } from "vitest";
import { PALEO_MAPS, placementsCoverAvailable } from "./paleo";
import { PERIODS } from "../sim/state";

describe("paleo maps", () => {
  it("has a map per period, each labelled illustrative", () => {
    for (const p of PERIODS) {
      expect(PALEO_MAPS[p]).toBeTruthy();
      expect(PALEO_MAPS[p].label.toLowerCase()).toContain("illustrative");
      expect(PALEO_MAPS[p].continents.length).toBeGreaterThan(0);
    }
  });
  it("places every available region for its period", () => {
    for (const p of PERIODS) expect(placementsCoverAvailable(p)).toBe(true);
  });
});
