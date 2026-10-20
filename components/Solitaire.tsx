"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  newGame,
  draw,
  wasteToFoundation,
  wasteToTableau,
  tableauToFoundation,
  tableauToTableau,
  foundationToTableau,
  canStackTableau,
  canToFoundation,
  isWin,
  color,
  SUITS,
  type Card,
  type GameState,
} from "@/lib/solitaire";
import { GameInfo } from "@/components/GameInfo";
import { GameLeaderboard } from "@/components/GameLeaderboard";

const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SYM: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

// Human-readable names for accessible card labels.
const RANK_NAMES = ["", "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
const SUIT_NAMES: Record<string, string> = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };

function cardLabel(card: Card): string {
  return `${RANK_NAMES[card.rank] ?? card.rank} of ${SUIT_NAMES[card.suit] ?? card.suit}`;
}

// Trigger a click-style handler from the keyboard (Enter / Space).
function activateOnKey(e: ReactKeyboardEvent<HTMLDivElement>, fn: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    if (e.key === " ") e.preventDefault();
    fn();
  }
}

// Deterministic win animation — 26 cards fan outward from foundation area
const WIN_CARDS = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * 2 * Math.PI;
  return {
    tx: `${Math.round(Math.cos(angle) * 110)}vw`,
    ty: `${Math.round(Math.sin(angle) * 90)}vh`,
    rot: (i % 2 === 0 ? 1 : -1) * (180 + i * 13),
    delay: i * 0.075,
    bg: i % 4 < 2 ? "#f6f6fa" : "#d6394d",
  };
});

type Selected =
  | null
  | { type: "waste" }
  | { type: "foundation"; pile: number }
  | { type: "tableau"; pile: number; index: number };

function CardFace({
  card,
  selected,
  onClick,
  onDoubleClick,
  draggable,
  onDragStart,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  if (!card.faceUp) {
    return (
      <div
        className="sol-card back"
        role="button"
        tabIndex={-1}
        aria-label="Face-down card"
        onClick={onClick}
      />
    );
  }
  const interactive = !!onClick;
  return (
    <div
      className={`sol-card ${color(card.suit)}${selected ? " sel" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={cardLabel(card)}
      aria-pressed={interactive ? !!selected : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => activateOnKey(e, () => onClick?.()) : undefined}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <span className="sol-corner">
        {RANKS[card.rank]}
        {SYM[card.suit]}
      </span>
      <span className="sol-pip">{SYM[card.suit]}</span>
    </div>
  );
}

export function Solitaire() {
  const [game, setGame] = useState<GameState>(() => newGame());
  const [drawMode, setDrawMode] = useState<1 | 3>(1);
  const [selected, setSelected] = useState<Selected>(null);
  const [history, setHistory] = useState<{ game: GameState; score: number }[]>([]);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [showWinAnim, setShowWinAnim] = useState(false);
  const startedRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const dragSrcRef = useRef<Selected>(null);

  const won = useMemo(() => isWin(game), [game]);

  // Fire win animation exactly once on win transition
  useEffect(() => {
    if (won) setShowWinAnim(true);
  }, [won]);

  useEffect(() => {
    if (won) return;
    const id = setInterval(() => {
      if (startedRef.current !== null)
        setElapsed(Math.round((Date.now() - startedRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [won]);

  // True when no face-down cards remain anywhere in tableau
  const allFaceUp = useMemo(
    () => game.tableau.every((pile) => pile.every((c) => c.faceUp)),
    [game],
  );

  const apply = useCallback(
    (next: GameState | null): boolean => {
      if (!next) { setMessage("That move isn’t available. Build down in alternating colours; empty columns need a King."); return false; }
      setMessage("");
      if (startedRef.current === null) startedRef.current = Date.now();
      setHistory((h) => [...h, { game, score }]);
      setGame(next);
      return true;
    },
    [game, score],
  );

  const start = useCallback(() => {
    startedRef.current = null;
    setElapsed(0);
    setGame(newGame());
    setHistory([]);
    setSelected(null);
    setScore(0);
    setMessage("");
    setShowWinAnim(false);
  }, []);

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setGame(previous.game);
    setScore(previous.score);
    setHistory(history.slice(0, -1));
    setSelected(null);
    setMessage("");
    setShowWinAnim(false);
  }, [history]);
  // Synchronous loop: move every available card to foundations at once,
  // drawing from stock as needed when no direct foundation move is available.
  const autoComplete = useCallback(() => {
    let cur = game;
    const hist = [...history];
    let gain = 0;
    // Track consecutive iterations with no foundation move to detect a stuck state.
    let noFoundationStreak = 0;
    let stockWasteCount = cur.stock.length + cur.waste.length;

    for (let i = 0; i < 1000; i++) {
      if (isWin(cur)) break;

      // Try to move waste top or any tableau top to a foundation.
      let next: GameState | null = wasteToFoundation(cur);
      if (!next) {
        for (let p = 0; p < 7 && !next; p++) {
          next = tableauToFoundation(cur, p);
        }
      }

      if (next) {
        // Foundation move succeeded — record it and reset stuck detector.
        hist.push({ game: cur, score: score + gain });
        cur = next;
        gain += 5;
        noFoundationStreak = 0;
        stockWasteCount = cur.stock.length + cur.waste.length;
      } else {
        // No foundation move available — draw from stock/waste to expose new cards.
        noFoundationStreak++;
        if (noFoundationStreak > stockWasteCount + 1) break; // full cycle with no progress

        const drawn = draw(cur, drawMode);
        if (!drawn) break; // stock and waste both empty — truly stuck

        hist.push({ game: cur, score: score + gain });
        cur = drawn;
        // Auto-complete draws score nothing (+5 is for foundation moves only; no −2 penalty).
      }
    }

    if (cur !== game) {
      if (startedRef.current === null) startedRef.current = Date.now();
      setHistory(hist);
      setGame(cur);
      setScore((s) => s + gain);
    }
  }, [game, history, drawMode, score]);

  const onStock = () => {
    setSelected(null);
    const wasDrawing = game.stock.length > 0;
    if (apply(draw(game, drawMode))) {
      if (drawMode === 3 && wasDrawing) setScore((s) => s - 2);
    }
  };

  const onWaste = () => {
    if (!game.waste.length) return;
    setSelected((s) => (s?.type === "waste" ? null : { type: "waste" }));
  };

  const onWasteDouble = () => {
    if (apply(wasteToFoundation(game))) { setSelected(null); setScore((s) => s + 5); }
  };

  const moveSelectedToTableau = (toPile: number): boolean => {
    if (selected?.type === "waste") {
      if (apply(wasteToTableau(game, toPile))) {
        setSelected(null);
        return true;
      }
    } else if (selected?.type === "foundation") {
      if (apply(foundationToTableau(game, selected.pile, toPile))) {
        setScore((s) => s - 5); setSelected(null); return true;
      }
    } else if (selected?.type === "tableau") {
      if (apply(tableauToTableau(game, selected.pile, selected.index, toPile))) {
        setSelected(null);
        return true;
      }
    }
    return false;
  };

  const onTableauCard = (pile: number, index: number) => {
    const card = game.tableau[pile][index];
    if (!card.faceUp) return;
    if (selected) {
      if (selected.type === "tableau" && selected.pile === pile && selected.index === index) {
        setSelected(null);
        return;
      }
      if (moveSelectedToTableau(pile)) return;
      setSelected({ type: "tableau", pile, index });
      return;
    }
    setSelected({ type: "tableau", pile, index });
  };

  const onTableauDouble = (pile: number, index: number) => {
    if (index !== game.tableau[pile].length - 1) return;
    if (apply(tableauToFoundation(game, pile))) { setSelected(null); setScore((s) => s + 5); }
  };

  const onTableauEmpty = (pile: number) => {
    if (selected) moveSelectedToTableau(pile);
  };

  const selectedCard = selected?.type === "waste" ? game.waste.at(-1) : selected?.type === "tableau" ? game.tableau[selected.pile][selected.index] : selected?.type === "foundation" ? game.foundations[selected.pile].at(-1) : undefined;
  const foundationReady = selectedCard && selected?.type !== "foundation" &&
    (selected?.type !== "tableau" || selected.index === game.tableau[selected.pile].length - 1) &&
    canToFoundation(selectedCard, game.foundations[SUITS.indexOf(selectedCard.suit)]);

  const onFoundation = (fi: number) => {
    if (!selected || selected.type === "foundation") {
      setSelected(game.foundations[fi].length ? { type: "foundation", pile: fi } : null);
      return;
    }
    if (!foundationReady || !selectedCard || SUITS.indexOf(selectedCard.suit) !== fi) {
      setMessage("Foundations build Ace to King in the same suit."); return;
    }
    const moved = selected.type === "waste" ? apply(wasteToFoundation(game)) : apply(tableauToFoundation(game, selected.pile));
    if (moved) { setSelected(null); setScore((s) => s + 5); }
  };

  // Called when a card is dropped onto a foundation slot
  const onFoundationDrop = (fi: number) => {
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    if (!src) return;
    const card = src.type === "waste" ? game.waste.at(-1) : src.type === "tableau" ? game.tableau[src.pile][src.index] : undefined;
    if (!card || SUITS.indexOf(card.suit) !== fi) return;
    let moved = false;
    if (src.type === "waste") {
      moved = apply(wasteToFoundation(game));
    } else if (src.type === "tableau") {
      const p = game.tableau[src.pile];
      if (src.index === p.length - 1) {
        moved = apply(tableauToFoundation(game, src.pile));
      }
    }
    if (moved) { setSelected(null); setScore((s) => s + 5); }
  };

  // Called when a card is dropped onto a tableau pile
  const onTableauDrop = (toPile: number) => {
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    if (!src) return;
    let moved = false;
    if (src.type === "waste") {
      moved = apply(wasteToTableau(game, toPile));
    } else if (src.type === "foundation") {
      moved = apply(foundationToTableau(game, src.pile, toPile));
      if (moved) setScore((s) => s - 5);
    } else if (src.type === "tableau") {
      moved = apply(tableauToTableau(game, src.pile, src.index, toPile));
    }
    if (moved) setSelected(null);
  };

  const wasteTop = game.waste[game.waste.length - 1];

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "Click", desc: "Select card, then click destination" },
          { key: "Drag", desc: "Drag a card to its destination" },
          { key: "Click stock", desc: "Draw new card" },
        ]}
        tips={["Uncover face-down cards before moving to foundations", "Keep aces and deuces accessible"]}
      />
      <div className="sol">
        {showWinAnim && (
          <div className="sol-win-overlay">
            {WIN_CARDS.map((c, i) => (
              <div
                key={i}
                className="sol-win-card"
                style={{
                  left: "72%",
                  top: "14%",
                  background: c.bg,
                  animationDelay: `${c.delay}s`,
                  "--sol-tx": c.tx,
                  "--sol-ty": c.ty,
                  "--sol-rot": `${c.rot}deg`,
                } as CSSProperties}
              />
            ))}
          </div>
        )}
        <div className="sudoku-bar">
          <div className="seg">
            {([1, 3] as const).map((m) => (
              <button
                key={m}
                className={`seg-btn${drawMode === m ? " active" : ""}`}
                onClick={() => { if (m === drawMode) return; if (history.length && !won && !window.confirm("Change draw mode and deal a new game?")) return; setDrawMode(m); start(); }}
              >
                Draw {m}
              </button>
            ))}
          </div>
          <span className="sol-score" aria-live="polite">{score} pts · {game.foundations.reduce((n, p) => n + p.length, 0)}/52</span>
          <div style={{ display: "flex", gap: 8 }}>
            {allFaceUp && !won && (
              <button className="btn ghost" onClick={autoComplete}>
                Auto-complete
              </button>
            )}
            <button className="btn ghost" onClick={undo} disabled={!history.length}>
              ↶ Undo
            </button>
            <button className="btn ghost" onClick={() => { if (!history.length || won || window.confirm("Deal a new game? This game will be replaced.")) start(); }}>
              New
            </button>
          </div>
        </div>

        <div className="sol-feedback" role="status">{message || (selectedCard ? `${cardLabel(selectedCard)} selected · tap a highlighted destination` : "Tap a card, then its destination.")}</div>
        <div className="sol-actions"><span>{game.stock.length} in stock</span>
          <button className="btn ghost" disabled={!foundationReady} onClick={() => { if (selectedCard) onFoundation(SUITS.indexOf(selectedCard.suit)); }}>Send to foundation ↑</button>
        </div>
        <div className="sol-top">
          <div
            className="sol-stock"
            role="button"
            tabIndex={0}
            aria-label={game.stock.length ? "Draw from stock" : "Recycle waste pile into stock"}
            onClick={onStock}
            onKeyDown={(e) => activateOnKey(e, onStock)}
          >
            {game.stock.length ? (
              <div className="sol-card back" />
            ) : (
              <div className="sol-slot recycle">↻</div>
            )}
          </div>
          <div className="sol-waste">
            {wasteTop ? (
              <CardFace
                card={wasteTop}
                selected={selected?.type === "waste"}
                onClick={onWaste}
                onDoubleClick={onWasteDouble}
                draggable
                onDragStart={() => { dragSrcRef.current = { type: "waste" }; }}
              />
            ) : (
              <div className="sol-slot" />
            )}
          </div>
          <div className="sol-spacer" />
          {game.foundations.map((f, fi) => (
            <div
              className={`sol-found${foundationReady && selectedCard?.suit === SUITS[fi] ? " legal" : ""}`}
              key={fi}
              role="button"
              tabIndex={0}
              aria-label={`Foundation pile ${SUIT_NAMES[SUITS[fi]] ?? ""}`.trim()}
              onClick={() => onFoundation(fi)}
              onKeyDown={(e) => activateOnKey(e, () => onFoundation(fi))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onFoundationDrop(fi)}
            >
              {f.length ? (
                <CardFace card={f[f.length - 1]} selected={selected?.type === "foundation" && selected.pile === fi} draggable onDragStart={() => { dragSrcRef.current = { type: "foundation", pile: fi }; }} />
              ) : (
                <div className="sol-slot suit">{SYM[SUITS[fi]]}</div>
              )}
            </div>
          ))}
        </div>

        {won ? <div className="sudoku-win" role="status" aria-live="polite">🎉 You won! Hit New to play again.</div> : null}

        <div className="sol-tableau">
          {game.tableau.map((pile, pi) => (
            <div
              className={`sol-pile${selectedCard && !(selected?.type === "tableau" && selected.pile === pi) && canStackTableau(selectedCard, pile.at(-1)) ? " legal" : ""}`}
              key={pi}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onTableauDrop(pi)}
            >
              {pile.length === 0 ? (
                <div
                  className="sol-slot"
                  role="button"
                  tabIndex={0}
                  aria-label="Empty tableau column"
                  onClick={() => onTableauEmpty(pi)}
                  onKeyDown={(e) => activateOnKey(e, () => onTableauEmpty(pi))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onTableauDrop(pi)}
                />
              ) : (
                pile.map((card, ci) => (
                  <div
                    key={card.id}
                    className={`sol-cardwrap${ci === 0 ? " first" : ""}${
                      !card.faceUp ? " facedown" : ""
                    }`}
                  >
                    <CardFace
                      card={card}
                      selected={
                        selected?.type === "tableau" &&
                        selected.pile === pi &&
                        ci >= selected.index
                      }
                      onClick={() => onTableauCard(pi, ci)}
                      onDoubleClick={() => onTableauDouble(pi, ci)}
                      draggable={card.faceUp}
                      onDragStart={
                        card.faceUp
                          ? () => { dragSrcRef.current = { type: "tableau", pile: pi, index: ci }; }
                          : undefined
                      }
                    />
                  </div>
                ))
              )}
            </div>
          ))}
        </div>

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">
            Tap a card, then tap where to move it · double-tap sends it to a
            foundation · ↻ recycles the stock.
          </span>
        </div>
      </div>
      <GameLeaderboard game="solitaire" value={elapsed} over={won} title="Solitaire" />
    </div>
  );
}
