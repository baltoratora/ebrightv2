// Klondike Solitaire logic. Pure (no DOM), unit-tested.

export type Suit = "S" | "H" | "D" | "C";

export interface Card {
  id: string;
  rank: number; // 1=A … 13=K
  suit: Suit;
  faceUp: boolean;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][]; // index by SUITS order; each pile is one suit
  tableau: Card[][]; // 7 piles
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];

export function isRed(s: Suit): boolean {
  return s === "H" || s === "D";
}
export function color(s: Suit): "red" | "black" {
  return isRed(s) ? "red" : "black";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      d.push({ id: `${s}${rank}`, rank, suit: s, faceUp: false });
    }
  }
  return shuffle(d);
}

export function newGame(): GameState {
  const deck = makeDeck();
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let k = 0;
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j <= i; j++) {
      const c = { ...deck[k++] };
      c.faceUp = j === i; // only the last card of each pile is face up
      tableau[i].push(c);
    }
  }
  const stock = deck.slice(k).map((c) => ({ ...c, faceUp: false }));
  return { stock, waste: [], foundations: [[], [], [], []], tableau };
}

export function cloneState(s: GameState): GameState {
  return {
    stock: s.stock.map((c) => ({ ...c })),
    waste: s.waste.map((c) => ({ ...c })),
    foundations: s.foundations.map((f) => f.map((c) => ({ ...c }))),
    tableau: s.tableau.map((p) => p.map((c) => ({ ...c }))),
  };
}

function flipTop(pile: Card[]): void {
  if (pile.length && !pile[pile.length - 1].faceUp) {
    pile[pile.length - 1].faceUp = true;
  }
}

export function canStackTableau(moving: Card, onto: Card | undefined): boolean {
  if (!onto) return moving.rank === 13; // only a King to an empty pile
  return color(moving.suit) !== color(onto.suit) && moving.rank === onto.rank - 1;
}

export function canToFoundation(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 1; // Ace starts a foundation
  const top = pile[pile.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

export function isWin(s: GameState): boolean {
  return s.foundations.reduce((a, f) => a + f.length, 0) === 52;
}

/** Draw `count` from stock to waste; if stock is empty, recycle the waste. */
export function draw(s: GameState, count: number): GameState | null {
  if (s.stock.length === 0 && s.waste.length === 0) return null;
  const n = cloneState(s);
  if (n.stock.length === 0) {
    n.stock = n.waste.reverse().map((c) => ({ ...c, faceUp: false }));
    n.waste = [];
    return n;
  }
  const take = Math.min(count, n.stock.length);
  for (let i = 0; i < take; i++) {
    const c = n.stock.pop()!;
    c.faceUp = true;
    n.waste.push(c);
  }
  return n;
}

export function wasteToFoundation(s: GameState): GameState | null {
  if (!s.waste.length) return null;
  const card = s.waste[s.waste.length - 1];
  const fi = SUITS.indexOf(card.suit);
  if (!canToFoundation(card, s.foundations[fi])) return null;
  const n = cloneState(s);
  n.foundations[fi].push(n.waste.pop()!);
  return n;
}

export function tableauToFoundation(s: GameState, pile: number): GameState | null {
  const p = s.tableau[pile];
  if (!p.length) return null;
  const card = p[p.length - 1];
  if (!card.faceUp) return null;
  const fi = SUITS.indexOf(card.suit);
  if (!canToFoundation(card, s.foundations[fi])) return null;
  const n = cloneState(s);
  n.foundations[fi].push(n.tableau[pile].pop()!);
  flipTop(n.tableau[pile]);
  return n;
}

export function wasteToTableau(s: GameState, toPile: number): GameState | null {
  if (!s.waste.length) return null;
  const card = s.waste[s.waste.length - 1];
  const dest = s.tableau[toPile];
  if (!canStackTableau(card, dest[dest.length - 1])) return null;
  const n = cloneState(s);
  n.tableau[toPile].push(n.waste.pop()!);
  return n;
}

/** Move the run starting at `fromIndex` of one tableau pile onto another. */
export function tableauToTableau(
  s: GameState,
  fromPile: number,
  fromIndex: number,
  toPile: number,
): GameState | null {
  if (fromPile === toPile) return null;
  const src = s.tableau[fromPile];
  if (fromIndex < 0 || fromIndex >= src.length) return null;
  const run = src.slice(fromIndex);
  if (run.some((c) => !c.faceUp)) return null;
  const dest = s.tableau[toPile];
  if (!canStackTableau(run[0], dest[dest.length - 1])) return null;
  const n = cloneState(s);
  const moving = n.tableau[fromPile].splice(fromIndex);
  n.tableau[toPile].push(...moving);
  flipTop(n.tableau[fromPile]);
  return n;
}
