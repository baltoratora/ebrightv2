import { describe, it, expect } from "vitest";
import {
  deal,
  holderOf3D,
  classify,
  beats,
  findBotPlay,
  chooseBotMove,
  fiveCardCombos,
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

describe("chooseBotMove — medium", () => {
  it("passes rather than spend a 2 when only a 2 can beat the current play", () => {
    const hand = [c(5, "C"), c(15, "S")]; // 5♣ cannot beat A♠; only the 2♠ can
    expect(chooseBotMove(hand, [c(14, "S")], false, "medium")).toBeNull();
  });
  it("prefers leading a pair over a single when hand is ≤5 cards", () => {
    const hand = [c(5, "C"), c(5, "H"), c(9, "S")];
    expect(chooseBotMove(hand, null, false, "medium")).toEqual([c(5, "C"), c(5, "H")]);
  });
  it("plays a non-2 to beat current when available", () => {
    const hand = [c(7, "C"), c(15, "S")];
    expect(chooseBotMove(hand, [c(6, "S")], false, "medium")).toEqual([c(7, "C")]);
  });
});

describe("chooseBotMove — hard", () => {
  it("leads a combo over a single when hand is ≤3 cards (aggressive)", () => {
    const hand = [c(5, "C"), c(5, "H"), c(9, "S")];
    expect(chooseBotMove(hand, null, false, "hard")).toEqual([c(5, "C"), c(5, "H")]);
  });
  it("plays the minimal winning single when following (no overpay)", () => {
    const hand = [c(7, "C"), c(9, "S"), c(13, "H")];
    expect(chooseBotMove(hand, [c(6, "S")], false, "hard")).toEqual([c(7, "C")]);
  });
  it("leads a combo when an opponent is near winning (≤2 cards)", () => {
    const hand = [c(5, "C"), c(5, "H"), c(9, "S"), c(10, "D"), c(11, "C")];
    const ctx = { opponentCardCounts: [5, 2, 5, 5], myPlayerIndex: 2 };
    expect(chooseBotMove(hand, null, false, "hard", ctx)).toEqual([c(5, "C"), c(5, "H")]);
  });
  it("leads a straight when holding one and no pairs are available (prefers 5-card over single)", () => {
    // 6 cards with a straight 3-4-5-6-7, no pairs — non-aggressive order [2,3,5,1] should pick the straight
    const hand = [c(3, "S"), c(4, "H"), c(5, "D"), c(6, "C"), c(7, "S"), c(9, "H")];
    const result = chooseBotMove(hand, null, false, "hard");
    expect(result).toHaveLength(5);
    expect(classify(result!)?.type).toBe("straight");
  });
  it("following: saves 2 without context (differs from Easy) but plays 2 when opponent near winning", () => {
    // Only a 2♠ can beat A♠
    const hand = [c(5, "C"), c(15, "S")];
    const current = [c(14, "S")];
    const aggressiveCtx = { opponentCardCounts: [2, 5, 5, 5], myPlayerIndex: 1 };
    // Easy always plays minimum winner — spends the 2
    expect(chooseBotMove(hand, current, false, "easy")).toEqual([c(15, "S")]);
    // Hard (no context): saves the 2, passes — THIS would fail if Hard were identical to Easy
    expect(chooseBotMove(hand, current, false, "hard")).toBeNull();
    // Hard (opponent near winning): plays the 2 aggressively to deny the lead
    expect(chooseBotMove(hand, current, false, "hard", aggressiveCtx)).toEqual([c(15, "S")]);
  });
});

describe("fiveCardCombos", () => {
  it("returns valid 5-card combos and excludes non-combo subsets", () => {
    // Hand contains exactly one straight (3-4-5-6-7) and one flush (all hearts sub-hand is absent here)
    const hand = [c(3, "S"), c(4, "H"), c(5, "D"), c(6, "C"), c(7, "S"), c(9, "H")];
    const combos = fiveCardCombos(hand);
    // Must include the straight
    expect(combos.some((cs) => classify(cs)?.type === "straight")).toBe(true);
    // Every returned combo must be a valid Big 2 five-card combo
    combos.forEach((cs) => expect(classify(cs)).not.toBeNull());
    // The random 5-card subset [3,4,5,6,9] is NOT a straight — should not appear as a combo
    const badSubset = [c(3, "S"), c(4, "H"), c(5, "D"), c(6, "C"), c(9, "H")];
    expect(fiveCardCombos(badSubset)).toHaveLength(0);
  });
});
