import { describe, it, expect } from "vitest";
import {
  otherSeat,
  seatColor,
  assignSeat,
  genRoomCode,
  isValidCode,
  normalizeCode,
  SEAT_FULL,
} from "./roomProtocol";

describe("room seating", () => {
  it("toggles seats", () => {
    expect(otherSeat(0)).toBe(1);
    expect(otherSeat(1)).toBe(0);
  });

  it("maps seats to chess colours (seat 0 = white)", () => {
    expect(seatColor(0)).toBe("w");
    expect(seatColor(1)).toBe("b");
  });

  it("assigns the lowest free seat, then reports full", () => {
    expect(assignSeat([])).toBe(0);
    expect(assignSeat([0])).toBe(1);
    expect(assignSeat([1])).toBe(0);
    expect(assignSeat([0, 1])).toBe(SEAT_FULL);
  });
});

describe("invite codes", () => {
  it("generates codes of the requested length from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = genRoomCode();
      expect(code).toHaveLength(4);
      expect(isValidCode(code)).toBe(true);
      // never contains ambiguous characters
      expect(/[O0I1]/.test(code)).toBe(false);
    }
  });

  it("normalizes and validates user input", () => {
    expect(normalizeCode(" ab2 ")).toBe("AB2");
    expect(isValidCode("ab2")).toBe(true);
    expect(isValidCode("xx")).toBe(false); // too short
    expect(isValidCode("has space")).toBe(false);
    expect(isValidCode("O0I1")).toBe(false); // ambiguous chars not allowed
  });
});
