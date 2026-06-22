import { describe, it, expect } from "vitest";
import {
  deal,
  holderOf3D,
  classify,
  beats,
  findBotPlay,
  type Card,
  type Suit,
} from "./big2";

const c = (value: number, suit: Suit): Card => ({ id: `${suit}${value}`, value, suit });

describe("deal", () => {
  it("gives 4 hands of 13", () => {
    const hands = deal();
    expect(hands).toHaveLength(4);
    hands.forEach((h) => expect(h).toHaveLength(13));
    expect(holderOf3D(hands)).toBeGreaterThanOrEqual(0);
  });
});

describe("classify", () => {
  it("singles, pairs, triples", () => {
    expect(classify([c(5, "S")])?.type).toBe("single");
    expect(classify([c(7, "S"), c(7, "H")])?.type).toBe("pair");
    expect(classify([c(7, "S"), c(8, "H")])).toBeNull();
    expect(classify([c(9, "S"), c(9, "H"), c(9, "D")])?.type).toBe("triple");
  });

  it("five-card hands", () => {
    expect(classify([c(3, "S"), c(4, "S"), c(5, "S"), c(6, "S"), c(7, "H")])?.type).toBe("straight");
    expect(classify([c(3, "H"), c(6, "H"), c(9, "H"), c(11, "H"), c(13, "H")])?.type).toBe("flush");
    expect(classify([c(5, "S"), c(5, "H"), c(5, "D"), c(9, "S"), c(9, "H")])?.type).toBe("fullhouse");
    expect(classify([c(8, "S"), c(8, "H"), c(8, "D"), c(8, "C"), c(2 + 0, "S")])?.type).toBe("four");
    expect(classify([c(4, "C"), c(5, "C"), c(6, "C"), c(7, "C"), c(8, "C")])?.type).toBe("straightflush");
    expect(classify([c(3, "S"), c(5, "H"), c(8, "D"), c(11, "C"), c(13, "S")])).toBeNull();
  });
});

describe("beats", () => {
  it("anything legal can lead", () => {
    expect(beats([c(3, "D")], null)).toBe(true);
  });
  it("higher single (2 is highest) beats lower", () => {
    expect(beats([c(15, "D")], [c(14, "S")])).toBe(true); // 2 beats A
    expect(beats([c(5, "H")], [c(5, "S")])).toBe(false); // heart can't beat spade
    expect(beats([c(5, "S")], [c(5, "C")])).toBe(true); // spade beats club
  });
  it("must match length", () => {
    expect(beats([c(9, "S"), c(9, "H")], [c(14, "S")])).toBe(false); // pair vs single
  });
  it("five-card categories rank correctly", () => {
    const straight = [c(3, "S"), c(4, "S"), c(5, "S"), c(6, "S"), c(7, "H")];
    const flush = [c(3, "H"), c(6, "H"), c(9, "H"), c(11, "H"), c(13, "H")];
    const four = [c(8, "S"), c(8, "H"), c(8, "D"), c(8, "C"), c(9, "S")];
    expect(beats(flush, straight)).toBe(true);
    expect(beats(four, flush)).toBe(true);
    expect(beats(straight, four)).toBe(false);
  });
});

describe("findBotPlay", () => {
  it("leads with the 3♦ when required", () => {
    const hand = [c(3, "D"), c(7, "H"), c(10, "S")];
    expect(findBotPlay(hand, null, true)).toEqual([c(3, "D")]);
  });
  it("passes when it cannot beat the current play", () => {
    const hand = [c(3, "D"), c(4, "C")];
    expect(findBotPlay(hand, [c(15, "S")], false)).toBeNull(); // can't beat the 2♠
  });
  it("plays the lowest beating single", () => {
    const hand = [c(6, "C"), c(9, "S"), c(13, "H")];
    expect(findBotPlay(hand, [c(5, "S")], false)).toEqual([c(6, "C")]);
  });
});
