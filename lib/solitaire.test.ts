import { describe, it, expect } from "vitest";
import {
  newGame,
  draw,
  canStackTableau,
  canToFoundation,
  tableauToTableau,
  wasteToFoundation,
  isWin,
  type Card,
  type GameState,
} from "./solitaire";

const card = (suit: Card["suit"], rank: number, faceUp = true): Card => ({
  id: `${suit}${rank}`,
  rank,
  suit,
  faceUp,
});

describe("newGame", () => {
  it("deals 28 tableau cards + 24 stock, last of each pile face up", () => {
    const g = newGame();
    expect(g.tableau).toHaveLength(7);
    let tableauCards = 0;
    g.tableau.forEach((pile, i) => {
      expect(pile).toHaveLength(i + 1);
      expect(pile[pile.length - 1].faceUp).toBe(true);
      pile.slice(0, -1).forEach((c) => expect(c.faceUp).toBe(false));
      tableauCards += pile.length;
    });
    expect(tableauCards).toBe(28);
    expect(g.stock).toHaveLength(24);
    expect(g.stock.every((c) => !c.faceUp)).toBe(true);
  });
});

describe("canStackTableau", () => {
  it("requires alternating color and descending rank", () => {
    expect(canStackTableau(card("H", 6), card("S", 7))).toBe(true); // red on black, 6 on 7
    expect(canStackTableau(card("H", 6), card("D", 7))).toBe(false); // same color
    expect(canStackTableau(card("H", 5), card("S", 7))).toBe(false); // wrong rank
    expect(canStackTableau(card("S", 13), undefined)).toBe(true); // King to empty
    expect(canStackTableau(card("S", 12), undefined)).toBe(false); // non-King to empty
  });
});

describe("canToFoundation", () => {
  it("needs an Ace to start, then ascending same suit", () => {
    expect(canToFoundation(card("H", 1), [])).toBe(true);
    expect(canToFoundation(card("H", 2), [])).toBe(false);
    expect(canToFoundation(card("H", 2), [card("H", 1)])).toBe(true);
    expect(canToFoundation(card("S", 2), [card("H", 1)])).toBe(false); // wrong suit
  });
});

describe("draw", () => {
  it("moves cards to waste, then recycles when stock empties", () => {
    const g = newGame();
    const d1 = draw(g, 3)!;
    expect(d1.waste).toHaveLength(3);
    expect(d1.waste.every((c) => c.faceUp)).toBe(true);
    expect(d1.stock).toHaveLength(21);
    // draw the rest, then recycle
    let s: GameState = d1;
    while (s.stock.length) s = draw(s, 3)!;
    expect(s.waste.length).toBe(24);
    const recycled = draw(s, 3)!;
    expect(recycled.stock).toHaveLength(24);
    expect(recycled.waste).toHaveLength(0);
  });
});

describe("tableauToTableau", () => {
  it("moves a valid run and flips the newly exposed card", () => {
    const g = newGame();
    // craft a deterministic state
    g.tableau = [
      [card("S", 5, false), card("H", 7)], // pile 0: facedown 5S, faceup 7H
      [card("S", 8)], // pile 1: 8S
      [], [], [], [], [],
    ];
    const moved = tableauToTableau(g, 0, 1, 1)!; // 7H onto 8S
    expect(moved).not.toBeNull();
    expect(moved.tableau[1].map((c) => c.id)).toEqual(["S8", "H7"]);
    expect(moved.tableau[0]).toHaveLength(1);
    expect(moved.tableau[0][0].faceUp).toBe(true); // 5S flipped up
  });

  it("rejects an invalid stack", () => {
    const g = newGame();
    g.tableau = [[card("H", 7)], [card("D", 8)], [], [], [], [], []];
    expect(tableauToTableau(g, 0, 0, 1)).toBeNull(); // red on red
  });
});

describe("isWin", () => {
  it("is true when all 52 cards are on foundations", () => {
    const full = (s: Card["suit"]) =>
      Array.from({ length: 13 }, (_, i) => card(s, i + 1));
    const g = newGame();
    g.foundations = [full("S"), full("H"), full("D"), full("C")];
    expect(isWin(g)).toBe(true);
  });
});
