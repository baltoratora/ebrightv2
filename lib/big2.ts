// Big 2 (Big Two / Cap Sa) logic. Pure, unit-tested.
// value: 3..15 where J=11,Q=12,K=13,A=14,2=15. Suit order D<C<H<S.

export type Suit = "D" | "C" | "H" | "S";
export const SUITS: Suit[] = ["D", "C", "H", "S"];

export interface Card {
  id: string;
  value: number; // 3..15
  suit: Suit;
}

export const SUIT_SYM: Record<Suit, string> = { D: "♦", C: "♣", H: "♥", S: "♠" };

export function label(value: number): string {
  if (value <= 10) return String(value);
  return { 11: "J", 12: "Q", 13: "K", 14: "A", 15: "2" }[value]!;
}

/** Total ordering of a single card. */
export function strength(c: Card): number {
  return c.value * 4 + SUITS.indexOf(c.suit);
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
    for (let v = 3; v <= 15; v++) d.push({ id: `${s}${v}`, value: v, suit: s });
  }
  return d;
}

/** Deal 13 cards to each of 4 players, hands sorted ascending by strength. */
export function deal(): Card[][] {
  const deck = shuffle(makeDeck());
  const hands: Card[][] = [[], [], [], []];
  deck.forEach((c, i) => hands[i % 4].push(c));
  hands.forEach((h) => h.sort((a, b) => strength(a) - strength(b)));
  return hands;
}

export function holderOf3D(hands: Card[][]): number {
  return hands.findIndex((h) => h.some((c) => c.value === 3 && c.suit === "D"));
}

export type ComboType =
  | "single"
  | "pair"
  | "triple"
  | "straight"
  | "flush"
  | "fullhouse"
  | "four"
  | "straightflush";

export interface Combo {
  type: ComboType;
  key: number; // higher beats lower (only meaningful within the same length)
  len: number;
}

function combinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  const rec = (start: number, combo: T[]) => {
    if (combo.length === k) {
      res.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      rec(i + 1, combo);
      combo.pop();
    }
  };
  rec(0, []);
  return res;
}

function classify5(cards: Card[]): Combo | null {
  const vals = cards.map((c) => c.value).sort((a, b) => a - b);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const isStraight = vals.every((v, i) => i === 0 || v === vals[i - 1] + 1);
  const byVal = new Map<number, number>();
  vals.forEach((v) => byVal.set(v, (byVal.get(v) ?? 0) + 1));
  const sizes = [...byVal.values()].sort((a, b) => b - a);
  const topStrength = Math.max(...cards.map(strength));

  if (isStraight && isFlush) return { type: "straightflush", key: 5e6 + topStrength, len: 5 };
  if (sizes[0] === 4) {
    const quad = [...byVal].find(([, c]) => c === 4)![0];
    return { type: "four", key: 4e6 + quad, len: 5 };
  }
  if (sizes[0] === 3 && sizes[1] === 2) {
    const tri = [...byVal].find(([, c]) => c === 3)![0];
    return { type: "fullhouse", key: 3e6 + tri, len: 5 };
  }
  if (isFlush) return { type: "flush", key: 2e6 + topStrength, len: 5 };
  if (isStraight) return { type: "straight", key: 1e6 + topStrength, len: 5 };
  return null;
}

/** Classify a set of cards as a legal Big 2 combo, or null if illegal. */
export function classify(cards: Card[]): Combo | null {
  const n = cards.length;
  if (n === 1) return { type: "single", key: strength(cards[0]), len: 1 };
  if (n === 2) {
    if (cards[0].value !== cards[1].value) return null;
    const key = cards[0].value * 4 + Math.max(...cards.map((c) => SUITS.indexOf(c.suit)));
    return { type: "pair", key, len: 2 };
  }
  if (n === 3) {
    if (!cards.every((c) => c.value === cards[0].value)) return null;
    return { type: "triple", key: cards[0].value, len: 3 };
  }
  if (n === 5) return classify5(cards);
  return null;
}

/** Does `play` legally beat `current` (or lead, if current is null)? */
export function beats(play: Card[], current: Card[] | null): boolean {
  const pc = classify(play);
  if (!pc) return false;
  if (!current) return true;
  const cc = classify(current);
  if (!cc) return false;
  if (pc.len !== cc.len) return false;
  return pc.key > cc.key;
}

function combosOfLength(hand: Card[], len: number): Card[][] {
  if (len === 1) return hand.map((c) => [c]);
  if (len === 5) return fiveCardCombos(hand);
  const byVal = new Map<number, Card[]>();
  for (const c of hand) {
    if (!byVal.has(c.value)) byVal.set(c.value, []);
    byVal.get(c.value)!.push(c);
  }
  const out: Card[][] = [];
  for (const cards of byVal.values()) {
    if (cards.length >= len) out.push(...combinations(cards, len));
  }
  return out;
}

/** Return all valid 5-card Big 2 combos (straight/flush/fullhouse/four/straightflush) from `hand`. */
export function fiveCardCombos(hand: Card[]): Card[][] {
  return combinations(hand, 5).filter((p) => classify(p) !== null);
}

// Easy bot: always plays lowest valid combo, leads with lowest single.
export function findBotPlay(
  hand: Card[],
  current: Card[] | null,
  mustInclude3D: boolean,
): Card[] | null {
  if (!current) {
    if (mustInclude3D) {
      const c = hand.find((x) => x.value === 3 && x.suit === "D");
      return c ? [c] : [hand[0]];
    }
    return [hand[0]]; // lowest single
  }
  const beating = combosOfLength(hand, current.length).filter((p) => beats(p, current));
  if (!beating.length) return null;
  beating.sort((a, b) => classify(a)!.key - classify(b)!.key);
  return beating[0];
}

export type Difficulty = "easy" | "medium" | "hard";

export interface BotContext {
  opponentCardCounts: number[]; // card count per player index
  myPlayerIndex: number;
}

function is2(c: Card): boolean { return c.value === 15; }
function uses2(cards: Card[]): boolean { return cards.some(is2); }

// Medium: saves 2s for defense; prefers combos when hand is small.
function chooseMediumMove(hand: Card[], current: Card[] | null, mustInclude3D: boolean): Card[] | null {
  const allTwos = hand.every(is2);
  if (!current) {
    if (mustInclude3D) {
      const x = hand.find((c) => c.value === 3 && c.suit === "D");
      return x ? [x] : [hand[0]];
    }
    if (hand.length <= 5) {
      for (const len of [2, 3, 5, 1]) {
        const combos = combosOfLength(hand, len).filter((p) => !uses2(p) || allTwos);
        if (combos.length) { combos.sort((a, b) => classify(a)!.key - classify(b)!.key); return combos[0]; }
      }
    }
    const non2 = hand.filter((c) => !is2(c));
    return non2.length ? [non2[0]] : [hand[0]];
  }
  const len = current.length;
  const beating = combosOfLength(hand, len).filter((p) => beats(p, current));
  if (!beating.length) return null;
  if (!allTwos) {
    const non2b = beating.filter((p) => !uses2(p));
    if (non2b.length) { non2b.sort((a, b) => classify(a)!.key - classify(b)!.key); return non2b[0]; }
    return null; // pass rather than spend a 2
  }
  beating.sort((a, b) => classify(a)!.key - classify(b)!.key);
  return beating[0];
}

// Hard: prefers combos that shed more cards; aggressive when hand is small or opponent is near winning.
// When following, saves 2s by default but overrides when an opponent is about to win.
function chooseHardMove(hand: Card[], current: Card[] | null, mustInclude3D: boolean, context?: BotContext): Card[] | null {
  const opponentNearWin = context
    ? context.opponentCardCounts.some((n, i) => i !== context.myPlayerIndex && n <= 2)
    : false;

  if (!current) {
    if (mustInclude3D) {
      const x = hand.find((c) => c.value === 3 && c.suit === "D");
      return x ? [x] : [hand[0]];
    }
    const aggressive = hand.length <= 3 || opponentNearWin;
    const order = aggressive ? [5, 3, 2, 1] : [2, 3, 5, 1];
    for (const len of order) {
      const combos = len === 5 ? fiveCardCombos(hand) : combosOfLength(hand, len);
      if (combos.length) { combos.sort((a, b) => classify(a)!.key - classify(b)!.key); return combos[0]; }
    }
    return [hand[0]];
  }

  // Following — differentiated from Easy:
  // Default Hard saves 2s (passes when only a 2 can beat, same as Medium).
  // When an opponent is near winning, Hard plays aggressively — uses any winner including 2s.
  const len = current.length;
  const allCombos = len === 5 ? fiveCardCombos(hand) : combosOfLength(hand, len);
  const beating = allCombos.filter((p) => beats(p, current));
  if (!beating.length) return null;

  beating.sort((a, b) => classify(a)!.key - classify(b)!.key);

  if (opponentNearWin) {
    // Aggressive: play the minimal winner regardless of card value to deny opponent the lead.
    return beating[0];
  }

  // Default: save 2s — pass rather than spend one when not under immediate threat.
  const allTwos = hand.every(is2);
  if (!allTwos) {
    const non2Beating = beating.filter((p) => !uses2(p));
    if (non2Beating.length) {
      non2Beating.sort((a, b) => classify(a)!.key - classify(b)!.key);
      return non2Beating[0];
    }
    return null; // preserve 2s
  }
  return beating[0];
}

// chooseBotMove dispatches to the correct difficulty implementation.
export function chooseBotMove(
  hand: Card[],
  current: Card[] | null,
  mustInclude3D: boolean,
  difficulty: Difficulty,
  context?: BotContext,
): Card[] | null {
  if (difficulty === "medium") return chooseMediumMove(hand, current, mustInclude3D);
  if (difficulty === "hard") return chooseHardMove(hand, current, mustInclude3D, context);
  return findBotPlay(hand, current, mustInclude3D);
}
