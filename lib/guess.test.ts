import { describe, it, expect } from "vitest";
import { normalize } from "./guess";

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("Brazil")).toBe("brazil");
  });
  it("strips accents", () => {
    expect(normalize("Côte d'Ivoire")).toBe("cote d ivoire");
    expect(normalize("São Tomé")).toBe("sao tome");
  });
  it("collapses punctuation and runs of spaces to single spaces and trims", () => {
    expect(normalize("  Saint   Kitts and Nevis ")).toBe("saint kitts and nevis");
    expect(normalize("Guinea-Bissau")).toBe("guinea bissau");
    expect(normalize("St. Lucia")).toBe("st lucia");
  });
});
