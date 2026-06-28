import { describe, it, expect } from "vitest";
import {
  otherSeat,
  seatColor,
  assignSeat,
  genRoomCode,
  isValidCode,
  normalizeCode,
  isValidClientMsg,
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

describe("isValidClientMsg", () => {
  const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  it("accepts a well-formed move", () => {
    expect(isValidClientMsg({ t: "move", move: { from: "e2", to: "e4" }, state: fen })).toBe(true);
  });
  it("accepts a well-formed reset and rematch", () => {
    expect(isValidClientMsg({ t: "reset", state: fen })).toBe(true);
    expect(isValidClientMsg({ t: "rematch" })).toBe(true);
  });
  it("rejects a move with no state (would bind undefined to a NOT NULL column)", () => {
    expect(isValidClientMsg({ t: "move", move: { from: "e2", to: "e4" } })).toBe(false);
  });
  it("rejects a move with no move object, and a reset with no state", () => {
    expect(isValidClientMsg({ t: "move", state: fen })).toBe(false);
    expect(isValidClientMsg({ t: "reset" })).toBe(false);
  });
  it("rejects an oversized state, unknown types, and non-objects", () => {
    expect(isValidClientMsg({ t: "move", move: { from: "a", to: "b" }, state: "x".repeat(5000) })).toBe(false);
    expect(isValidClientMsg({ t: "bogus" })).toBe(false);
    expect(isValidClientMsg(null)).toBe(false);
    expect(isValidClientMsg("move")).toBe(false);
  });
});
