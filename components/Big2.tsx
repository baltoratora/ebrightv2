"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deal,
  holderOf3D,
  classify,
  beats,
  findBotPlay,
  label,
  SUIT_SYM,
  type Card,
} from "@/lib/big2";

interface G {
  hands: Card[][];
  current: { cards: Card[]; player: number } | null;
  turn: number;
  passes: number;
  firstPlay: boolean;
  winner: number | null;
}

function freshGame(): G {
  const hands = deal();
  return { hands, current: null, turn: holderOf3D(hands), passes: 0, firstPlay: true, winner: null };
}

function applyPlay(g: G, player: number, cards: Card[]): G {
  const ids = new Set(cards.map((c) => c.id));
  const hands = g.hands.map((h, i) => (i === player ? h.filter((c) => !ids.has(c.id)) : h));
  const won = hands[player].length === 0;
  return {
    ...g,
    hands,
    current: { cards, player },
    passes: 0,
    firstPlay: false,
    turn: (player + 1) % 4,
    winner: won ? player : null,
  };
}

function applyPass(g: G, player: number): G {
  const passes = g.passes + 1;
  if (passes >= 3 && g.current) {
    return { ...g, current: null, passes: 0, turn: g.current.player };
  }
  return { ...g, passes, turn: (player + 1) % 4 };
}

const BOT_NAMES = ["You", "Bot 1", "Bot 2", "Bot 3"];

function B2Card({
  card,
  selected,
  small,
  onClick,
}: {
  card: Card;
  selected?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const red = card.suit === "H" || card.suit === "D";
  return (
    <div
      className={`b2-card${red ? " red" : ""}${selected ? " sel" : ""}${small ? " small" : ""}`}
      onClick={onClick}
    >
      <span className="b2-corner">
        {label(card.value)}
        {SUIT_SYM[card.suit]}
      </span>
    </div>
  );
}

export function Big2() {
  const [g, setG] = useState<G>(() => freshGame());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");

  const newGame = useCallback(() => {
    setG(freshGame());
    setSel(new Set());
    setMsg("");
  }, []);

  // Bots take their turns automatically.
  useEffect(() => {
    if (g.winner !== null || g.turn === 0) return;
    const id = setTimeout(() => {
      setG((prev) => {
        if (prev.winner !== null || prev.turn === 0) return prev;
        const p = prev.turn;
        const play = findBotPlay(
          prev.hands[p],
          prev.current ? prev.current.cards : null,
          prev.firstPlay && !prev.current,
        );
        return play ? applyPlay(prev, p, play) : applyPass(prev, p);
      });
    }, 750);
    return () => clearTimeout(id);
  }, [g]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 1400);
  };

  const toggle = (id: string) => {
    if (g.turn !== 0 || g.winner !== null) return;
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const play = () => {
    if (g.turn !== 0 || g.winner !== null) return;
    const cards = g.hands[0].filter((c) => sel.has(c.id));
    if (!cards.length) return flash("Select cards to play");
    if (!classify(cards)) return flash("Not a valid combo");
    if (g.firstPlay && !cards.some((c) => c.value === 3 && c.suit === "D")) {
      return flash("First play must include 3♦");
    }
    if (!beats(cards, g.current ? g.current.cards : null))
      return flash("Doesn't beat the current play");
    setG((prev) => applyPlay(prev, 0, cards));
    setSel(new Set());
  };

  const pass = () => {
    if (g.turn !== 0 || g.winner !== null || !g.current) return;
    setG((prev) => applyPass(prev, 0));
    setSel(new Set());
  };

  const status = useMemo(() => {
    if (g.winner !== null) return g.winner === 0 ? "🎉 You win!" : `${BOT_NAMES[g.winner]} wins`;
    if (g.turn === 0) return g.current ? "Your turn — beat it or pass" : "Your turn — lead any combo";
    return `${BOT_NAMES[g.turn]} is thinking…`;
  }, [g]);

  return (
    <div className="b2">
      <div className="sudoku-bar">
        <span className="wg-progress">{status}</span>
        <button className="btn ghost" onClick={newGame}>
          New
        </button>
      </div>

      <div className="b2-opponents">
        {[1, 2, 3].map((p) => (
          <div key={p} className={`b2-opp${g.turn === p ? " active" : ""}`}>
            <span className="b2-opp-name">{BOT_NAMES[p]}</span>
            <span className="b2-opp-count">🂠 {g.hands[p].length}</span>
          </div>
        ))}
      </div>

      <div className="b2-table">
        {g.current ? (
          <>
            <div className="b2-table-label">{BOT_NAMES[g.current.player]} played</div>
            <div className="b2-play">
              {g.current.cards.map((c) => (
                <B2Card key={c.id} card={c} small />
              ))}
            </div>
          </>
        ) : (
          <div className="b2-table-label">
            {g.winner !== null ? "Game over" : `${BOT_NAMES[g.turn]} leads a new round`}
          </div>
        )}
      </div>

      {msg ? <div className="wg-msg">{msg}</div> : null}

      <div className="b2-hand">
        {g.hands[0].map((c) => (
          <B2Card key={c.id} card={c} selected={sel.has(c.id)} onClick={() => toggle(c.id)} />
        ))}
      </div>

      <div className="sudoku-controls b2-controls">
        <button className="btn" onClick={play} disabled={g.turn !== 0 || g.winner !== null}>
          Play
        </button>
        <button
          className="btn ghost"
          onClick={pass}
          disabled={g.turn !== 0 || g.winner !== null || !g.current}
        >
          Pass
        </button>
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Tap cards to select, then Play. Singles, pairs, triples, or 5-card
          hands · 2 is highest · ♦&lt;♣&lt;♥&lt;♠.
        </span>
      </div>
    </div>
  );
}
