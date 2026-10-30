"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { bestMove } from "@/lib/chessAI";
import { chessPieceIds, undoBotTurn } from "@/lib/chess-session";
import { ChessPiece } from "@/components/chess/ChessPiece";
import { AnimatePresence, LazyMotion, domMax, LayoutGroup, MotionConfig, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import "@/components/chess/chess.css";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";
import { useGameFullscreen } from "@/lib/useGameFullscreen";
import { GameFullscreenButton } from "@/components/GameFullscreenButton";
import { useRoom } from "@/lib/useRoom";
import {
  genRoomCode,
  isValidCode,
  normalizeCode,
  seatColor,
  type ServerMsg,
} from "@/lib/roomProtocol";

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
  const { containerRef: studioRef, expanded, windowFullscreen, toggleFullscreen } = useGameFullscreen();
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [thinking, setThinking] = useState(false);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduceMotion = useReducedMotion();
  const [remoteMove, setRemoteMove] = useState<{ from: Square; to: Square } | null>(null);
  const [notice, setNotice] = useState("");
  const cancelPending = useCallback(() => {
    if (aiTimer.current !== null) clearTimeout(aiTimer.current);
    aiTimer.current = null;
    hintTimers.current.forEach(clearTimeout);
    hintTimers.current = [];
    setThinking(false);
    setHintFrom(null);
    setHintTo(null);
  }, []);
  useEffect(() => () => {
    if (aiTimer.current !== null) clearTimeout(aiTimer.current);
    hintTimers.current.forEach(clearTimeout);
  }, []);

  // Hint highlight squares, separate from the persistent previous-move trail.
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
  const promotionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pendingPromo) return;
    const previous = document.activeElement;
    promotionRef.current?.querySelector("button")?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [pendingPromo]);

  // ── multiplayer ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("ai");
  const [code, setCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);

  const game = gameRef.current;
  const rerender = () => setVersion((v) => v + 1);

  // Auto-scroll move history to the latest entry
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [version]);

  // Apply events coming from the opponent. The server never echoes our own
  // moves, so "move"/"reset" here are always the other player's.
  const onEvent = useCallback((msg: ServerMsg) => {
    if (msg.t === "welcome") {
      setRemoteMove(null);
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
        if (msg.t === "move") {
          try { gameRef.current.move(msg.move); } catch { /* resynchronise below */ }
          if (gameRef.current.fen() !== msg.state) gameRef.current.load(msg.state);
        } else gameRef.current.load(msg.state || new Chess().fen());
      } catch {
        return;
      }
      setRemoteMove(msg.t === "move" ? { from: msg.move.from as Square, to: msg.move.to as Square } : null);
      setSelected(null);
      setPendingPromo(null);
      rerender();
    }
  }, []);

  const room = useRoom(mode === "online" ? code : null, onEvent);
  const online = mode === "online";
  const myColor = online ? seatColor(room.seat ?? 0) : "w"; // seat 0 = white, 1 = black
  const connected = room.status === "open";
  const bothPresent = room.peers >= 2;
  const myTurn = game.turn() === myColor;

  const dests = useMemo<Set<string>>(() => {
    if (!selected) return new Set();
    return new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, game.fen()]);

  const newGame = useCallback(() => {
    cancelPending();
    setRemoteMove(null);
    setNotice("");
    gameRef.current = new Chess();
    setSelected(null);
    setThinking(false);
    setHintFrom(null);
    setHintTo(null);
    setPendingPromo(null);
    if (mode === "online") room.send({ t: "reset", state: gameRef.current.fen() });
    rerender();
  }, [mode, room, cancelPending]);

  const undo = useCallback(() => {
    if (online) return;
    cancelPending();
    if (pendingPromo) {
      setPendingPromo(null);
      setSelected(null);
      setNotice("Promotion cancelled. Choose your move again.");
      return;
    }
    const undone = undoBotTurn(gameRef.current);
    setSelected(null);
    setNotice(undone.length ? "Move taken back. Your turn again." : "No moves to take back yet.");
    rerender();
  }, [online, pendingPromo, cancelPending]);

  const showHint = useCallback(() => {
    if (online || game.isGameOver() || thinking || game.turn() !== "w" || pendingPromo) return;
    hintTimers.current.forEach(clearTimeout);
    const fen = game.fen();
    const targetGame = game;
    hintTimers.current = [setTimeout(() => {
      if (gameRef.current !== targetGame || targetGame.fen() !== fen) return;
      const move = bestMove(new Chess(fen), DEPTH[difficulty]);
      if (!move) return;
      setHintFrom(move.from);
      setHintTo(move.to);
      setNotice(`Try ${move.from} to ${move.to}.`);
      hintTimers.current.push(setTimeout(() => {
        setHintFrom(null);
        setHintTo(null);
      }, 1800));
    }, 0)];
  }, [game, difficulty, thinking, online, pendingPromo]);

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
    setNotice("");
    setHintFrom(null);
    setHintTo(null);
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
    setNotice("");
    setHintFrom(null);
    setHintTo(null);
    if (online) room.send({ t: "move", move: { from, to }, state: game.fen() });
    rerender();
  };

  const canInteract = online ? connected && bothPresent && myTurn : !thinking && game.turn() === "w";

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

  // Cancelled synchronously by Undo/New; the position guard also rejects stale work.
  useEffect(() => {
    if (online || game.turn() !== "b" || game.isGameOver()) return;
    setThinking(true);
    const fen = game.fen();
    aiTimer.current = setTimeout(() => {
      if (gameRef.current !== game || game.fen() !== fen) return;
      const move = bestMove(new Chess(fen), DEPTH[difficulty]);
      if (move) game.move(move);
      aiTimer.current = null;
      setThinking(false);
      rerender();
    }, 550);
    return () => {
      if (aiTimer.current !== null) clearTimeout(aiTimer.current);
      aiTimer.current = null;
    };
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
    cancelPending();
    setRemoteMove(null);
    setNotice("");
    setCode(genRoomCode());
    setMode("online");
    gameRef.current = new Chess();
    setSelected(null);
    setPendingPromo(null);
    rerender();
  };
  const startJoin = () => {
    if (!isValidCode(joinInput)) return;
    cancelPending();
    setRemoteMove(null);
    setNotice("");
    setCode(normalizeCode(joinInput));
    setMode("online");
    gameRef.current = new Chess();
    setSelected(null);
    setPendingPromo(null);
    rerender();
  };
  const leaveOnline = () => {
    cancelPending();
    setRemoteMove(null);
    setNotice("");
    setMode("ai");
    setCode(null);
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

  const historyMoves = game.history({ verbose: true });
  const lastMove = historyMoves.at(-1) ?? remoteMove;
  const pieceIds = chessPieceIds(game);
  const movePairs: { number: number; white?: (typeof historyMoves)[number]; black?: (typeof historyMoves)[number] }[] = [];
  historyMoves.forEach((move) => {
    const number = Number(move.before.split(" ")[5]);
    let pair = movePairs.at(-1);
    if (!pair || pair.number !== number) { pair = { number }; movePairs.push(pair); }
    pair[move.color === "w" ? "white" : "black"] = move;
  });
  const capturedBy = (color: "w" | "b") => historyMoves.filter((move) => move.color === color && move.captured).map((move) => move.captured!);
  const checkSquare = game.inCheck() ? game.board().flat().find((piece) => piece?.type === "k" && piece.color === game.turn())?.square : null;
  const ply = historyMoves.length;
  const phase = online ? "Live room" : ply < 16 ? "Opening" : ply < 50 ? "Middlegame" : "Endgame";
  const pieceTransition = { type: "tween" as const, ease: "easeOut" as const, duration: reduceMotion ? 0 : .18 };

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
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domMax} strict>
    <LayoutGroup id="chess-studio">
    <div ref={studioRef} className={`cs-studio${expanded ? " cs-expanded" : ""}${windowFullscreen ? " cs-window-fullscreen" : ""}`}>
      <div className="cs-heading">
        <div><span className="cs-eyebrow">THE CHESS ROOM <span aria-hidden="true">/</span> PLAY WITH INTENTION</span><h2>A little strategy. <em>A beautiful game.</em></h2></div>
        <div className="cs-heading-tools">
          <div className="cs-edition"><span aria-hidden="true">♔</span><span>64 squares.<br />Endless possibility.</span></div>
          <GameFullscreenButton className="cs-fullscreen-toggle" expanded={expanded} onToggle={toggleFullscreen} />
        </div>
      </div>
      <div className="cs-layout">
        <m.section className="cs-table" aria-label="Chess match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .35 }}>
          <div className={`cs-player ${game.turn() !== myColor ? "cs-player-active" : ""}`}>
            <div className="cs-avatar cs-avatar-bot"><ChessPiece type="n" color={myColor === "w" ? "b" : "w"} /></div>
            <div className="cs-player-name"><strong>{online ? "Your opponent" : "The Strategist"}</strong><span>{online ? bothPresent ? "Connected opponent" : "Waiting for a player" : `${difficulty[0].toUpperCase() + difficulty.slice(1)} computer · Onyx pieces`}</span></div>
            <span className="cs-player-tag">{thinking ? "THINKING" : online ? "ONLINE" : "BOT"}</span>
            <div className="cs-captured" aria-label="Captured by opponent">{capturedBy(myColor === "w" ? "b" : "w").map((type, i) => <ChessPiece key={i} type={type} color={myColor} />)}</div>
          </div>
          <div className="cs-board-frame">
            <div className="cs-board" role="group" aria-label="Chess board">
              {cells.map(({ sq, cell, light }, index) => {
                const isLast = sq === lastMove?.from || sq === lastMove?.to;
                const isHint = sq === hintFrom || sq === hintTo;
                const label = `${sq}, ${cell ? `${cell.color === "w" ? "white" : "black"} ${PIECE_NAME[cell.type]}` : "empty"}${isLast ? ", previous move" : ""}${selected === sq ? ", selected" : ""}${dests.has(sq) ? ", legal destination" : ""}`;
                return <button key={sq} className={`cs-square ${light ? "cs-light" : "cs-dark"}${isLast ? " cs-last" : ""}${sq === lastMove?.to ? " cs-last-to" : ""}${sq === checkSquare ? " cs-check" : ""}`}
                  aria-label={label} aria-pressed={selected === sq} onClick={() => onSquare(sq)}>
                  {index % 8 === 0 && <span className="cs-rank" aria-hidden="true">{sq[1]}</span>}
                  {index >= 56 && <span className="cs-file" aria-hidden="true">{sq[0]}</span>}
                  {isLast && <span className="cs-trail" aria-hidden="true" />}
                  {selected === sq && <m.span className="cs-selection" layoutId="selection" transition={{ duration: reduceMotion ? 0 : .14 }} aria-hidden="true" />}
                  {isHint && <m.span className="cs-hint-ring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-hidden="true" />}
                  {dests.has(sq) && <m.span className={cell ? "cs-target cs-target-capture" : "cs-target"} initial={{ opacity: 0, scale: .5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .15 }} aria-hidden="true" />}
                  {cell && <m.span className="cs-piece" layout="position" layoutId={`piece-${pieceIds[sq]}`} initial={false} transition={pieceTransition} style={{ zIndex: selected === sq || lastMove?.to === sq ? 5 : 2 }}>
                    <ChessPiece type={cell.type} color={cell.color} />
                  </m.span>}
                </button>;
              })}
            </div>
          </div>
          <div className={`cs-player ${game.turn() === myColor ? "cs-player-active" : ""}`}>
            <div className="cs-avatar"><ChessPiece type="k" color={myColor} /></div>
            <div className="cs-player-name"><strong>You <span className="cs-you">{myColor === "w" ? "IVORY" : "ONYX"}</span></strong><span>{myColor === "w" ? "White pieces · First to move" : "Black pieces · Second to move"}</span></div>
            <span className="cs-player-tag">{game.turn() === myColor && !game.isGameOver() ? "YOUR TURN" : "PLAYER"}</span>
            <div className="cs-captured" aria-label="Captured by you">{capturedBy(myColor).map((type, i) => <ChessPiece key={i} type={type} color={myColor === "w" ? "b" : "w"} />)}</div>
          </div>
          <div className="cs-board-key"><span><i className="cs-key-last" /> Previous move</span><span><i className="cs-key-legal" /> Legal destination</span><span>Click a piece, then its destination</span></div>
        </m.section>
        <aside className="cs-sidebar">
          <section className="cs-match-card">
            <div className="cs-card-top"><span className="cs-eyebrow">AT THE BOARD</span><span className="cs-live-dot" aria-hidden="true" /></div>
            <div className="cs-status" role="status" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}><m.h3 key={status} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .13 }}>{status}</m.h3></AnimatePresence>
            </div>
            <p className="cs-status-sub">{game.isGameOver() ? "Every finish is a new beginning. Play again or take a move back." : thinking ? "Looking for a reply. You can still take your move back." : selected ? `${PIECE_NAME[game.get(selected)?.type ?? "p"]} on ${selected} · ${dests.size} legal destinations` : "Take your time. Find the move that feels right."}</p>
            {!online ? <><span className="cs-setting-label">YOUR OPPONENT</span><div className="cs-difficulty" role="group" aria-label="Bot difficulty">{(["easy", "medium", "hard"] as Difficulty[]).map((level) => <button key={level} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}>{difficulty === level && <m.span layoutId="difficulty" className="cs-difficulty-active" transition={{ type: "tween", duration: .18, ease: "easeOut" }} />}<span>{level[0].toUpperCase() + level.slice(1)}</span></button>)}</div></> : <div className="cs-room">Room <strong>{code}</strong><button className="cs-link" onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button></div>}
            <div className="cs-actions">
              {!online && <m.button className="cs-action cs-undo" whileTap={{ scale: .97 }} onClick={undo} disabled={ply === 0 && !pendingPromo} title="Take back your move and the computer's reply"><span aria-hidden="true">↶</span> Undo turn</m.button>}
              {!online && <m.button className="cs-action" whileTap={{ scale: .97 }} onClick={showHint} disabled={thinking || game.turn() !== "w" || game.isGameOver() || !!pendingPromo}><span aria-hidden="true">✧</span> Hint</m.button>}
              <button className="cs-action cs-new" onClick={newGame}>New game <span aria-hidden="true">↗</span></button>
            </div>
            <div className="cs-notice" role="status" aria-live="polite">{notice || (online ? "Live rooms do not allow takebacks." : "Undo takes back a full turn, including the bot’s reply.")}</div>
          </section>
          <section className="cs-ledger" aria-label="Move history">
            <div className="cs-ledger-heading"><h3>Move journal</h3><span>{String(Math.ceil(ply / 2)).padStart(2, "0")} MOVES</span></div>
            <div className="cs-ledger-labels"><span>#</span><span>IVORY</span><span>ONYX</span></div>
            <div className="cs-moves" ref={historyRef} aria-live="polite" aria-relevant="additions text">
              {movePairs.length === 0 ? <div className="cs-empty-journal"><span aria-hidden="true">✦</span><p>{online ? "Moves in this session appear here." : "Your opening chapter."}<br /><small>{online ? "The journal starts from the current room position." : "Make a move to begin your journal."}</small></p></div> : movePairs.map((pair) => <m.div className="cs-move-row" key={pair.number} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span>{String(pair.number).padStart(2, "0")}</span><span className={!pair.black ? "cs-latest" : ""}>{pair.white?.san ?? "—"}</span><span className={pair.black && pair === movePairs.at(-1) ? "cs-latest" : ""}>{pair.black?.san ?? "…"}</span></m.div>)}
            </div>
            <div className="cs-last-summary"><span>{phase}</span><span>{lastMove ? `${lastMove.from} → ${lastMove.to}` : "White to begin"}</span></div>
          </section>
          <details className="cs-more"><summary>Play with a friend <span aria-hidden="true">+</span></summary><div>
            {online ? <button className="cs-action" onClick={leaveOnline}>Return to computer</button> : <><button className="cs-action" onClick={startCreate}>Create a room</button><label htmlFor="chess-room-code">Or enter a room code</label><div className="cs-join"><input id="chess-room-code" placeholder="ROOM CODE" maxLength={12} value={joinInput} onChange={(e) => setJoinInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && startJoin()} /><button className="cs-action" onClick={startJoin} disabled={!isValidCode(joinInput)}>Join</button></div></>}
          </div></details>
        </aside>
      </div>
      <div className="cs-extras"><GameInfo controls={[{ key: "Click / Enter", desc: "Select a piece, then a legal destination" }, { key: "Undo turn", desc: "Take back your move and the bot’s reply" }]} tips={["Gold squares show the previous move. Dots show legal destinations; rings show captures.", "A hint outlines its suggested move for a moment. Undo is also available while the bot is thinking.", "Control the centre and castle early to protect your king."]} /><GameLeaderboard game="chess" value={Math.ceil(ply / 2)} over={!online && game.isCheckmate() && game.turn() === "b"} title="Chess · moves to win" /></div>
      <AnimatePresence>{pendingPromo && <m.div ref={promotionRef} className="cs-promotion-overlay" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); setPendingPromo(null); }
        if (event.key === "Tab") {
          const buttons = promotionRef.current?.querySelectorAll<HTMLButtonElement>("button");
          if (!buttons?.length) return;
          const first = buttons[0]; const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }} role="dialog" aria-modal="true" aria-label="Choose promotion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <m.div className="cs-promotion" initial={{ y: 12 }} animate={{ y: 0 }}><span className="cs-eyebrow">A NEW POSSIBILITY</span><h3>Choose your promotion</h3><div>{PROMO_PIECES.map((piece) => <button key={piece} aria-label={`Promote to ${PIECE_NAME[piece]}`} onClick={() => applyPromo(piece)}><ChessPiece type={piece} color={pendingPromo.color} /><span>{PIECE_NAME[piece]}</span></button>)}</div><button className="cs-link" onClick={() => setPendingPromo(null)}>Cancel</button></m.div>
      </m.div>}</AnimatePresence>
    </div>
    </LayoutGroup>
    </LazyMotion>
    </MotionConfig>
  );
}
