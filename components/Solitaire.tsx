"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  newGame,
  draw,
  wasteToFoundation,
  wasteToTableau,
  tableauToFoundation,
  tableauToTableau,
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
    return <div className="sol-card back" onClick={onClick} />;
  }
  return (
    <div
      className={`sol-card ${color(card.suit)}${selected ? " sel" : ""}`}
      onClick={onClick}
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
  const [history, setHistory] = useState<GameState[]>([]);
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
      if (!next) return false;
      if (startedRef.current === null) startedRef.current = Date.now();
      setHistory((h) => [...h, game]);
      setGame(next);
      return true;
    },
    [game],
  );

  const start = useCallback(() => {
    startedRef.current = null;
    setElapsed(0);
    setGame(newGame());
    setHistory([]);
    setSelected(null);
    setScore(0);
    setShowWinAnim(false);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setGame(h[h.length - 1]);
      return h.slice(0, -1);
    });
    setSelected(null);
  }, []);

  // Synchronous loop: move every available card to foundations at once
  const autoComplete = useCallback(() => {
    let cur = game;
    const hist = [...history];
    let gain = 0;
    for (let i = 0; i < 200; i++) {
      if (isWin(cur)) break;
      let next: GameState | null = wasteToFoundation(cur);
      if (!next) {
        for (let p = 0; p < 7 && !next; p++) {
          next = tableauToFoundation(cur, p);
        }
      }
      if (!next) break;
      hist.push(cur);
      cur = next;
      gain += 5;
    }
    if (cur !== game) {
      if (startedRef.current === null) startedRef.current = Date.now();
      setHistory(hist);
      setGame(cur);
      setScore((s) => s + gain);
    }
  }, [game, history]);

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

  const onFoundation = () => {
    let moved = false;
    if (selected?.type === "waste") {
      moved = apply(wasteToFoundation(game));
    } else if (selected?.type === "tableau") {
      const p = game.tableau[selected.pile];
      if (selected.index === p.length - 1) {
        moved = apply(tableauToFoundation(game, selected.pile));
      }
    }
    if (moved) { setSelected(null); setScore((s) => s + 5); }
  };

  // Called when a card is dropped onto a foundation slot
  const onFoundationDrop = () => {
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    if (!src) return;
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
                onClick={() => setDrawMode(m)}
              >
                Draw {m}
              </button>
            ))}
          </div>
          <span className="sudoku-timer">Score: {score}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {allFaceUp && !won && (
              <button className="btn ghost" onClick={autoComplete}>
                Auto-complete
              </button>
            )}
            <button className="btn ghost" onClick={undo} disabled={!history.length}>
              ↶ Undo
            </button>
            <button className="btn ghost" onClick={start}>
              New
            </button>
          </div>
        </div>

        <div className="sol-top">
          <div className="sol-stock" onClick={onStock}>
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
              className="sol-found"
              key={fi}
              onClick={onFoundation}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onFoundationDrop}
            >
              {f.length ? (
                <CardFace card={f[f.length - 1]} />
              ) : (
                <div className="sol-slot suit">{SYM[SUITS[fi]]}</div>
              )}
            </div>
          ))}
        </div>

        {won ? <div className="sudoku-win">🎉 You won! Hit New to play again.</div> : null}

        <div className="sol-tableau">
          {game.tableau.map((pile, pi) => (
            <div
              className="sol-pile"
              key={pi}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onTableauDrop(pi)}
            >
              {pile.length === 0 ? (
                <div
                  className="sol-slot"
                  onClick={() => onTableauEmpty(pi)}
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
