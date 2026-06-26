"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deal,
  holderOf3D,
  classify,
  beats,
  chooseBotMove,
  label,
  SUIT_SYM,
  strength,
  type Card,
  type Difficulty,
} from "@/lib/big2";
import { GameInfo } from "@/components/GameInfo";

const ROUNDS = 5;
const BOT_NAMES = ["You", "Bot 1", "Bot 2", "Bot 3"];
const SUIT_DISPLAY_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };

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
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [sortBySuit, setSortBySuit] = useState(false);
  const [roundNum, setRoundNum] = useState(1);
  const [cumScores, setCumScores] = useState([0, 0, 0, 0]);
  const [allRoundsOver, setAllRoundsOver] = useState(false);

  const newGame = useCallback(() => {
    setG(freshGame());
    setSel(new Set());
    setMsg("");
    setRoundNum(1);
    setCumScores([0, 0, 0, 0]);
    setAllRoundsOver(false);
  }, []);

  const nextRound = useCallback(() => {
    if (g.winner === null) return;
    const penalties = g.hands.map((h, i) => (i === g.winner! ? 0 : h.length));
    const newCum = cumScores.map((s, i) => s + penalties[i]);
    setCumScores(newCum);
    if (roundNum >= ROUNDS) {
      setAllRoundsOver(true);
    } else {
      setRoundNum((r) => r + 1);
      setG(freshGame());
      setSel(new Set());
      setMsg("");
    }
  }, [g, cumScores, roundNum]);

  // Bots take their turns automatically.
  useEffect(() => {
    if (g.winner !== null || g.turn === 0) return;
    const id = setTimeout(() => {
      setG((prev) => {
        if (prev.winner !== null || prev.turn === 0) return prev;
        const p = prev.turn;
        const ctx = { opponentCardCounts: prev.hands.map((h) => h.length), myPlayerIndex: p };
        const play = chooseBotMove(
          prev.hands[p],
          prev.current ? prev.current.cards : null,
          prev.firstPlay && !prev.current,
          difficulty,
          ctx,
        );
        return play ? applyPlay(prev, p, play) : applyPass(prev, p);
      });
    }, 750);
    return () => clearTimeout(id);
  }, [g, difficulty]);

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

  // Player hand sorted by strength (default) or by suit grouping.
  const displayHand = useMemo(() => {
    if (!sortBySuit) return g.hands[0];
    return [...g.hands[0]].sort((a, b) => {
      const so = SUIT_DISPLAY_ORDER[a.suit] - SUIT_DISPLAY_ORDER[b.suit];
      if (so !== 0) return so;
      return strength(a) - strength(b);
    });
  }, [g.hands, sortBySuit]);

  // Current round penalties (only defined when a round has just ended).
  const roundPenalties = useMemo(() => {
    if (g.winner === null) return null;
    return g.hands.map((h, i) => (i === g.winner! ? 0 : h.length));
  }, [g.winner, g.hands]);

  // Scores shown: committed + this round's penalties (if round just ended).
  const displayScores = useMemo(() => {
    if (allRoundsOver) return cumScores;
    if (!roundPenalties) return cumScores;
    return cumScores.map((s, i) => s + roundPenalties[i]);
  }, [cumScores, roundPenalties, allRoundsOver]);

  const status = useMemo(() => {
    if (allRoundsOver) {
      const min = Math.min(...cumScores);
      const w = cumScores.indexOf(min);
      return w === 0 ? "🎉 You win the match!" : `${BOT_NAMES[w]} wins the match`;
    }
    if (g.winner !== null)
      return g.winner === 0 ? `🎉 Round ${roundNum}: You win!` : `Round ${roundNum}: ${BOT_NAMES[g.winner]} wins`;
    if (g.turn === 0) return g.current ? "Your turn — beat it or pass" : "Your turn — lead any combo";
    return `${BOT_NAMES[g.turn]} is thinking…`;
  }, [g, roundNum, allRoundsOver, cumScores]);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "Click card", desc: "Select / deselect" },
          { key: "Play", desc: "Submit selected hand" },
          { key: "Pass", desc: "Skip your turn" },
        ]}
        tips={["Save your 2s for when you need to beat strong hands", "Singles first, combos when behind"]}
      />
      <div className="b2">
        <div className="sudoku-bar">
          <span className="wg-progress">{status}</span>
          <button className="btn ghost" onClick={newGame}>
            New
          </button>
        </div>

        {/* Round counter, scores, and difficulty selector */}
        <div className="b2-meta">
          <div className="b2-meta-top">
            <span className="b2-round">Round {roundNum} / {ROUNDS}</span>
            <div className="b2-diff">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  className={`btn ghost b2-diff-btn${difficulty === d ? " b2-diff-active" : ""}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="b2-scores">
            {BOT_NAMES.map((name, i) => (
              <span key={i} className={`b2-score-item${i === 0 ? " b2-score-you" : ""}`}>
                {i === 0 ? "You" : name}: {displayScores[i]}
              </span>
            ))}
          </div>
        </div>

        <div className="b2-opponents">
          {[1, 2, 3].map((p) => (
            <div key={p} className={`b2-opp${g.turn === p ? " active" : ""}`}>
              <span className="b2-opp-name">{BOT_NAMES[p]}</span>
              {g.winner !== null ? (
                // Hand reveal at round end
                <div className="b2-opp-revealed">
                  {g.hands[p].length === 0 ? (
                    <span className="b2-opp-out">✓ Out</span>
                  ) : (
                    g.hands[p].map((c) => <B2Card key={c.id} card={c} small />)
                  )}
                </div>
              ) : (
                <span className="b2-opp-count">
                  🂠 {g.hands[p].length}
                  {g.hands[p].length === 1 && (
                    <span className="b2-last-card">⚠️ Last card!</span>
                  )}
                </span>
              )}
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
              {g.winner !== null
                ? allRoundsOver
                  ? "Match over"
                  : "Round over"
                : `${BOT_NAMES[g.turn]} leads a new round`}
            </div>
          )}
        </div>

        {msg ? <div className="wg-msg">{msg}</div> : null}

        <div className="b2-hand">
          {displayHand.map((c) => (
            <B2Card key={c.id} card={c} selected={sel.has(c.id)} onClick={() => toggle(c.id)} />
          ))}
        </div>

        <div className="sudoku-controls b2-controls">
          <button className="btn" onClick={play} disabled={g.turn !== 0 || g.winner !== null}>
            Play
          </button>
          <button
            className="btn ghost"
            onClick={() => setSortBySuit((v) => !v)}
            title="Toggle hand sort: by strength or by suit"
          >
            {sortBySuit ? "↕ Strength" : "♠ By suit"}
          </button>
          <button
            className="btn ghost"
            onClick={pass}
            disabled={g.turn !== 0 || g.winner !== null || !g.current}
          >
            Pass
          </button>
        </div>

        {/* Next round / match over controls */}
        {g.winner !== null && (
          <div className="b2-round-end">
            {allRoundsOver ? (
              <button className="btn" onClick={newGame}>
                Play Again
              </button>
            ) : (
              <button className="btn" onClick={nextRound}>
                Next Round
              </button>
            )}
          </div>
        )}

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">
            Tap cards to select, then Play. Singles, pairs, triples, or 5-card
            hands · 2 is highest · ♦&lt;♣&lt;♥&lt;♠.
          </span>
        </div>
      </div>
    </div>
  );
}
