"use client";

import { useCallback, useMemo, useState } from "react";
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

const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SYM: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

type Selected =
  | null
  | { type: "waste" }
  | { type: "tableau"; pile: number; index: number };

function CardFace({
  card,
  selected,
  onClick,
  onDoubleClick,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}) {
  if (!card.faceUp) {
    return <div className="sol-card back" onClick={onClick} />;
  }
  return (
    <div
      className={`sol-card ${color(card.suit)}${selected ? " sel" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
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

  const won = useMemo(() => isWin(game), [game]);

  const apply = useCallback(
    (next: GameState | null): boolean => {
      if (!next) return false;
      setHistory((h) => [...h, game]);
      setGame(next);
      return true;
    },
    [game],
  );

  const start = useCallback(() => {
    setGame(newGame());
    setHistory([]);
    setSelected(null);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setGame(h[h.length - 1]);
      return h.slice(0, -1);
    });
    setSelected(null);
  }, []);

  const onStock = () => {
    setSelected(null);
    apply(draw(game, drawMode));
  };

  const onWaste = () => {
    if (!game.waste.length) return;
    setSelected((s) => (s?.type === "waste" ? null : { type: "waste" }));
  };
  const onWasteDouble = () => {
    if (apply(wasteToFoundation(game))) setSelected(null);
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
    if (apply(tableauToFoundation(game, pile))) setSelected(null);
  };

  const onTableauEmpty = (pile: number) => {
    if (selected) moveSelectedToTableau(pile);
  };

  const onFoundation = () => {
    if (selected?.type === "waste") {
      if (apply(wasteToFoundation(game))) setSelected(null);
    } else if (selected?.type === "tableau") {
      const p = game.tableau[selected.pile];
      if (selected.index === p.length - 1) {
        if (apply(tableauToFoundation(game, selected.pile))) setSelected(null);
      }
    }
  };

  const wasteTop = game.waste[game.waste.length - 1];

  return (
    <div className="sol">
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
        <div style={{ display: "flex", gap: 8 }}>
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
            />
          ) : (
            <div className="sol-slot" />
          )}
        </div>
        <div className="sol-spacer" />
        {game.foundations.map((f, fi) => (
          <div className="sol-found" key={fi} onClick={onFoundation}>
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
          <div className="sol-pile" key={pi}>
            {pile.length === 0 ? (
              <div className="sol-slot" onClick={() => onTableauEmpty(pi)} />
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
  );
}
