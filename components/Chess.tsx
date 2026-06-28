"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { bestMove } from "@/lib/chessAI";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";
import { useRoom } from "@/lib/useRoom";
import {
  genRoomCode,
  isValidCode,
  normalizeCode,
  seatColor,
  type ServerMsg,
} from "@/lib/roomProtocol";

const GLYPH: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};

// Spoken piece names for accessibility labels
const PIECE_NAME: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
type Difficulty = "easy" | "medium" | "hard";
const DEPTH: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

type Mode = "ai" | "online";

// Promotion piece choices for the human player
const PROMO_PIECES = ["q", "r", "b", "n"] as const;
type PromoPiece = (typeof PROMO_PIECES)[number];

export function Chessboard() {
  const gameRef = useRef(new Chess());
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [thinking, setThinking] = useState(false);

  // Hint highlight squares (cleared after 400ms)
  const [hintFrom, setHintFrom] = useState<Square | null>(null);
  const [hintTo, setHintTo] = useState<Square | null>(null);

  // Pending promotion: blocked until the player picks a piece
  const [pendingPromo, setPendingPromo] = useState<{
    from: Square;
    to: Square;
    color: "w" | "b";
  } | null>(null);

  // Ref for history panel auto-scroll
  const historyRef = useRef<HTMLDivElement>(null);

  // ── multiplayer ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("ai");
  const [code, setCode] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);

  const game = gameRef.current;
  const rerender = () => setVersion((v) => v + 1);

  // Auto-scroll move history to the latest entry
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Apply events coming from the opponent. The server never echoes our own
  // moves, so "move"/"reset" here are always the other player's.
  const onEvent = useCallback((msg: ServerMsg) => {
    if (msg.t === "welcome") {
      if (msg.state) {
        try {
          gameRef.current.load(msg.state);
        } catch {
          /* ignore malformed state */
        }
        setSelected(null);
        rerender();
      }
    } else if (msg.t === "move" || msg.t === "reset") {
      try {
        gameRef.current.load(msg.state || new Chess().fen());
      } catch {
        /* ignore */
      }
      setSelected(null);
      rerender();
    }
  }, []);

  const room = useRoom(mode === "online" ? code : null, onEvent);
  const online = mode === "online";
  const myColor = seatColor(room.seat ?? 0); // seat 0 = white, 1 = black
  const connected = room.status === "open";
  const bothPresent = room.peers >= 2;
  const myTurn = game.turn() === myColor;

  const dests = useMemo<Set<string>>(() => {
    if (!selected) return new Set();
    return new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, game.fen()]);

  const newGame = useCallback(() => {
    gameRef.current = new Chess();
    setSelected(null);
    setThinking(false);
    setHintFrom(null);
    setHintTo(null);
    setPendingPromo(null);
    if (mode === "online") room.send({ t: "reset", state: gameRef.current.fen() });
    rerender();
  }, [mode, room]);

  const undo = useCallback(() => {
    if (thinking || online) return; // no undo in live play
    if (game.history().length) game.undo();
    if (game.turn() === "b" && game.history().length) game.undo();
    setSelected(null);
    rerender();
  }, [game, thinking, online]);

  // Show hint: run AI on a clone and flash the suggested from/to squares for 400ms
  const showHint = useCallback(() => {
    if (game.isGameOver() || thinking) return;
    const fen = game.fen();
    // Defer to avoid blocking the click response
    setTimeout(() => {
      const clone = new Chess(fen);
      const m = bestMove(clone, DEPTH[difficulty]);
      if (!m) return;
      setHintFrom(m.from as Square);
      setHintTo(m.to as Square);
      setTimeout(() => {
        setHintFrom(null);
        setHintTo(null);
      }, 400);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, thinking]);

  // Apply a chosen promotion piece to the pending promotion move
  const applyPromo = (promo: PromoPiece) => {
    if (!pendingPromo) return;
    const { from, to } = pendingPromo;
    try {
      game.move({ from, to, promotion: promo });
    } catch {
      setPendingPromo(null);
      return;
    }
    setPendingPromo(null);
    setSelected(null);
    if (online) room.send({ t: "move", move: { from, to, promotion: promo }, state: game.fen() });
    rerender();
  };

  const makeMove = (from: Square, to: Square) => {
    const piece = game.get(from);
    const lastRank = to[1] === "8" || to[1] === "1";
    const isPromo = piece?.type === "p" && lastRank;
    if (isPromo) {
      // Show promotion choice modal; move is applied after player picks
      setPendingPromo({ from, to, color: piece.color });
      setSelected(null);
      return;
    }
    try {
      game.move({ from, to });
    } catch {
      return;
    }
    setSelected(null);
    if (online) room.send({ t: "move", move: { from, to }, state: game.fen() });
    rerender();
  };

  const canInteract = online ? connected && bothPresent && myTurn : !thinking;

  const onSquare = (sq: Square) => {
    if (game.isGameOver()) return;
    if (!canInteract) return;
    if (pendingPromo) return; // wait for promotion choice
    const piece = game.get(sq);
    if (selected) {
      if (sq === selected) return setSelected(null);
      if (dests.has(sq)) return makeMove(selected, sq);
      if (piece && piece.color === myColor) return setSelected(sq);
      return setSelected(null);
    }
    if (piece && piece.color === myColor && game.turn() === myColor) setSelected(sq);
  };

  // Bot (Black) replies automatically — AI mode only.
  useEffect(() => {
    if (online) return;
    if (game.turn() !== "b" || game.isGameOver()) return;
    setThinking(true);
    const id = setTimeout(() => {
      const m = bestMove(game, DEPTH[difficulty]);
      if (m) game.move(m);
      setThinking(false);
      rerender();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen(), difficulty, online]);

  const status = useMemo(() => {
    if (online) {
      if (!connected) return room.status === "closed" ? "Disconnected — try again" : "Connecting…";
      if (!bothPresent) return "Waiting for opponent to join…";
      if (game.isCheckmate()) return myTurn ? "Checkmate — you lost" : "🎉 Checkmate — you win!";
      if (game.isStalemate()) return "Stalemate — draw";
      if (game.isDraw()) return "Draw";
      if (game.inCheck()) return myTurn ? "Check! Your move" : "Check!";
      return myTurn ? "Your move" : "Opponent's move…";
    }
    if (game.isCheckmate()) return game.turn() === "w" ? "Checkmate — Bot wins" : "🎉 Checkmate — you win!";
    if (game.isStalemate()) return "Stalemate — draw";
    if (game.isDraw()) return "Draw";
    if (game.inCheck()) return game.turn() === "w" ? "Check! Your move" : "Check!";
    if (thinking) return "Bot is thinking…";
    return game.turn() === "w" ? "Your move" : "…";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen(), thinking, online, connected, bothPresent, myTurn, room.status]);

  const startCreate = () => {
    setCode(genRoomCode());
    setMode("online");
    setSetupOpen(false);
    gameRef.current = new Chess();
    setSelected(null);
    setPendingPromo(null);
    rerender();
  };
  const startJoin = () => {
    if (!isValidCode(joinInput)) return;
    setCode(normalizeCode(joinInput));
    setMode("online");
    setSetupOpen(false);
    gameRef.current = new Chess();
    setSelected(null);
    setPendingPromo(null);
    rerender();
  };
  const leaveOnline = () => {
    setMode("ai");
    setCode(null);
    setSetupOpen(false);
    gameRef.current = new Chess();
    setSelected(null);
    setPendingPromo(null);
    rerender();
  };
  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  // Build move history pairs for the history panel
  const historyMoves = game.history();
  const historyPairs: string[] = [];
  for (let i = 0; i < historyMoves.length; i += 2) {
    const n = i / 2 + 1;
    historyPairs.push(`${n}. ${historyMoves[i]}${historyMoves[i + 1] ? " " + historyMoves[i + 1] : ""}`);
  }

  // Board rendering order — flip so the local player's pieces are at the bottom.
  const board = game.board();
  const flip = online && myColor === "b";
  const cells: { sq: Square; cell: ReturnType<typeof game.board>[number][number]; light: boolean }[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const r = flip ? 7 - i : i;
      const c = flip ? 7 - j : j;
      cells.push({
        sq: (FILES[c] + (8 - r)) as Square,
        cell: board[r][c],
        light: (r + c) % 2 === 0,
      });
    }
  }

  return (
    <div className="game-layout">
      <GameInfo
        controls={[{ key: "Click", desc: "Select piece, then click destination" }]}
        tips={[
          "Control the center; castle early for king safety",
          "Play a friend: share the room code — same code, two devices",
        ]}
      />
      <div className="chess">
        <div className="sudoku-bar">
          {online ? (
            <div className="mp-bar">
              <span className="mp-code">
                Room <strong>{code}</strong>
                <button className="btn ghost mp-copy" onClick={copyCode}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </span>
              <span className={`mp-dot${bothPresent ? " on" : ""}`} />
              <span className="muted mp-presence">
                {bothPresent ? `You're ${myColor === "w" ? "White" : "Black"}` : "Waiting…"}
              </span>
            </div>
          ) : (
            <div className="seg">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  className={`seg-btn${d === difficulty ? " active" : ""}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {!online && (
              <>
                <button className="btn ghost" onClick={undo} disabled={thinking}>
                  ↶ Undo
                </button>
                <button
                  className="btn ghost"
                  onClick={showHint}
                  disabled={thinking || game.isGameOver()}
                >
                  Hint
                </button>
              </>
            )}
            <button className="btn ghost" onClick={newGame}>
              New
            </button>
            {online ? (
              <button className="btn ghost" onClick={leaveOnline}>
                vs Computer
              </button>
            ) : (
              <button className="btn" onClick={() => setSetupOpen((v) => !v)}>
                Play a friend
              </button>
            )}
          </div>
        </div>

        {setupOpen && !online && (
          <div className="mp-setup">
            <button className="btn" onClick={startCreate}>
              Create a room
            </button>
            <span className="muted">or join with a code:</span>
            <input
              className="lb-input mp-join-input"
              placeholder="CODE"
              maxLength={12}
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && startJoin()}
            />
            <button className="btn ghost" onClick={startJoin} disabled={!isValidCode(joinInput)}>
              Join
            </button>
          </div>
        )}

        <div className="chess-status" role="status" aria-live="polite">{status}</div>

        <div className="chess-board">
          {cells.map(({ sq, cell, light }) => {
            const isHint = sq === hintFrom || sq === hintTo;
            const cls = [
              "chess-sq",
              light ? "light" : "dark",
              selected === sq ? "sel" : "",
              dests.has(sq) ? (cell ? "capture" : "dest") : "",
              isHint ? "hint" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const sqLabel = `${sq}, ${
              cell ? `${cell.color === "w" ? "white" : "black"} ${PIECE_NAME[cell.type]}` : "empty"
            }`;
            return (
              <div
                key={sq}
                className={cls}
                role="button"
                tabIndex={0}
                aria-label={sqLabel}
                onClick={() => onSquare(sq)}
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (e.key === " ") e.preventDefault();
                    onSquare(sq);
                  }
                }}
              >
                {cell ? (
                  <span className={`chess-piece ${cell.color === "w" ? "white" : "black"}`}>
                    {GLYPH[cell.type]}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Move history panel — single-player only */}
        {!online && historyPairs.length > 0 && (
          <div className="chess-history" ref={historyRef}>
            {historyPairs.map((pair, i) => (
              <span key={i} className="chess-history-pair">
                {pair}
              </span>
            ))}
          </div>
        )}

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">
            {online
              ? "Same code on both devices · tap a piece, then where to move · choose your promotion piece."
              : "You're White. Tap a piece, then tap where to move · choose your promotion piece."}
          </span>
        </div>

        {/* Promotion choice modal */}
        {pendingPromo && (
          <div className="chess-promo-overlay" role="dialog" aria-modal="true" aria-label="Choose promotion">
            <div className="chess-promo-card">
              <div className="lb-modal-title">Choose promotion</div>
              <div className="chess-promo-pieces">
                {PROMO_PIECES.map((p) => (
                  <button
                    key={p}
                    className="chess-promo-piece"
                    aria-label={`Promote to ${PIECE_NAME[p]}`}
                    onClick={() => applyPromo(p)}
                  >
                    <span
                      className={`chess-piece ${pendingPromo.color === "w" ? "white" : "black"}`}
                    >
                      {GLYPH[p]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <GameLeaderboard
        game="chess"
        value={Math.ceil(game.history().length / 2)}
        over={!online && game.isCheckmate() && game.turn() === "b"}
        title="Chess · moves to win"
      />
    </div>
  );
}
