import { describe, it, expect } from "vitest";
import { buildFactUrl, parseFact } from "./fact";

describe("buildFactUrl", () => {
  it("targets the daily fact endpoint", () => {
    expect(buildFactUrl()).toBe(
      "https://uselessfacts.jsph.pl/api/v2/facts/today",
    );
  });
});

describe("parseFact", () => {
  it("extracts and trims the text", () => {
    expect(
      parseFact({ text: "  Honey never spoils.  ", source: "djtech.net" }),
    ).toEqual({ text: "Honey never spoils.", source: "djtech.net" });
  });
  it("returns null for missing or empty text", () => {
    expect(parseFact({ source: "x" })).toBeNull();
    expect(parseFact({ text: "   " })).toBeNull();
    expect(parseFact(null)).toBeNull();
  });
});
