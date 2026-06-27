"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  newBoard,
  generateMoves,
  applyMove,
  countPieces,
  bestMove,
  cloneBoard,
  type Board,
  type Color,
  type Move,
  type Piece,
} from "@/lib/checkers";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

type Difficulty = "easy" | "medium" | "hard";
const DEPTH: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6 };

type GameMode = "single" | "two";

interface Snap {
  board: Board;
  turn: Color;
}

interface MidJump {
  piece: [number, number];
  alreadyCaptured: [number, number][];
  boardSoFar: Board;
  originBoard: Board;
  originTurn: Color;
}

function applySingleJump(
  b: Board,
  from: [number, number],
  capture: [number, number],
): { board: Board; landedAt: [number, number] } {
  const n = cloneBoard(b);
  const [fr, fc] = from;
  const [cr, cc] = capture;
  // Landing square is 2 steps in the direction of the capture.
  const lr = fr + 2 * (cr - fr);
  const lc = fc + 2 * (cc - fc);
  const p = n[fr][fc]!;
  n[fr][fc] = null;
  n[cr][cc] = null;
  const promoted = !p.king && (p.color === "r" ? lr === 0 : lr === 7);
  n[lr][lc] = { ...p, king: p.king || promoted };
  return { board: n, landedAt: [lr, lc] };
}

function nextJumpTargets(
  b: Board,
  r: number,
  c: number,
  p: Piece,
  alreadyCaptured: [number, number][],
): [number, number][] {
  const dirs: [number, number][] = p.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : p.color === "r"
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

  const out: [number, number][] = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc;
    const lr = r + 2 * dr, lc = c + 2 * dc;
    if (lr < 0 || lr >= 8 || lc < 0 || lc >= 8) continue;
    const mid = b[mr][mc];
    if (!mid || mid.color === p.color) continue;
    if (alreadyCaptured.some(([cr2, cc2]) => cr2 === mr && cc2 === mc)) continue;
    if (b[lr][lc] !== null) continue;
    out.push([lr, lc]);
  }
  return out;
}

export function Checkers() {
  const [board, setBoard] = useState<Board>(() => newBoard());
  const [turn, setTurn] = useState<Color>("r");
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<Snap[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>("single");
  const [midJump, setMidJump] = useState<MidJump | null>(null);
  const [landCell, setLandCell] = useState<string | null>(null);
  const landTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counts = useMemo(() => countPieces(board), [board]);
  const legal = useMemo(() => generateMoves(board, turn), [board, turn]);
  const winnerColor: Color | null =
    counts.r === 0 ? "b" : counts.b === 0 ? "r" : legal.length === 0 ? (turn === "r" ? "b" : "r") : null;
  const over = winnerColor !== null;

  // In single-player: only red's moves; in two-player: the current turn's moves.
  const myMoves = useMemo(() => {
    if (over) return [];
    if (gameMode === "two") return legal;
    return turn === "r" ? legal : [];
  }, [legal, turn, over, gameMode]);

  const fromSet = useMemo(
    () => new Set(myMoves.map((m) => `${m.from[0]},${m.from[1]}`)),
    [myMoves],
  );
  const destSet = useMemo(() => {
    if (!sel) return new Set<string>();
    return new Set(
      myMoves
        .filter((m) => m.from[0] === sel[0] && m.from[1] === sel[1])
        .map((m) => `${m.to[0]},${m.to[1]}`),
    );
  }, [myMoves, sel]);

  // Jump hint targets during a mid-jump sequence.
  const jumpHintSet = useMemo(() => {
    if (!midJump) return new Set<string>();
    const p = midJump.boardSoFar[midJump.piece[0]][midJump.piece[1]];
    if (!p) return new Set<string>();
    const targets = nextJumpTargets(
      midJump.boardSoFar,
      midJump.piece[0],
      midJump.piece[1],
      p,
      midJump.alreadyCaptured,
    );
    return new Set(targets.map(([r, c]) => `${r},${c}`));
  }, [midJump]);

  // Flash the landing cell for 300ms.
  const flashLand = useCallback((r: number, c: number) => {
    if (landTimerRef.current) clearTimeout(landTimerRef.current);
    setLandCell(`${r},${c}`);
    landTimerRef.current = setTimeout(() => {
      setLandCell(null);
      landTimerRef.current = null;
    }, 300);
  }, []);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (landTimerRef.current) clearTimeout(landTimerRef.current);
    };
  }, []);

  const newGame = useCallback(() => {
    setBoard(newBoard());
    setTurn("r");
    setSel(null);
    setThinking(false);
    setHistory([]);
    setMoveCount(0);
    setMidJump(null);
    setLandCell(null);
  }, []);

  const finishTurn = useCallback(
    (nextBoard: Board, historyBoard: Board, currentTurn: Color, destR: number, destC: number) => {
      setHistory((hh) => [...hh, { board: historyBoard, turn: currentTurn }]);
      setBoard(nextBoard);
      setTurn(currentTurn === "r" ? "b" : "r");
      setMoveCount((m) => m + 1);
      setSel(null);
      setMidJump(null);
      flashLand(destR, destC);
    },
    [flashLand],
  );

  const undo = useCallback(() => {
    if (thinking || !history.length) return;
    const h = [...history];
    let snap = h.pop()!;
    let undone = 1;
    // In single-player, skip over the AI's turn too.
    if (gameMode === "single") {
      while (snap.turn !== "r" && h.length) { snap = h.pop()!; undone++; }
    }
    setBoard(snap.board);
    setTurn(snap.turn);
    setHistory(h);
    setMoveCount((m) => Math.max(0, m - undone));
    setSel(null);
    setMidJump(null);
    setLandCell(null);
  }, [thinking, history, gameMode]);

  const onSquare = (r: number, c: number) => {
    const isPlayerTurn = gameMode === "two" ? !thinking && !over : turn === "r" && !over;
    if (!isPlayerTurn) return;

    // Mid-jump in progress: only allow jumping to a hint target.
    if (midJump) {
      const key = `${r},${c}`;
      if (jumpHintSet.has(key)) {
        const mj = midJump;
        const p = mj.boardSoFar[mj.piece[0]][mj.piece[1]]!;
        // Find which capture gets us here.
        const [pr, pc] = mj.piece;
        const dirs: [number, number][] = p.king
          ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
          : p.color === "r" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        let captureSquare: [number, number] | null = null;
        for (const [dr, dc] of dirs) {
          const mr = pr + dr, mc = pc + dc;
          const lr = pr + 2 * dr, lc = pc + 2 * dc;
          if (lr === r && lc === c) { captureSquare = [mr, mc]; break; }
        }
        if (!captureSquare) return;
        const { board: nextB } = applySingleJump(mj.boardSoFar, mj.piece, captureSquare);
        const newCaptured: [number, number][] = [...mj.alreadyCaptured, captureSquare];
        const landedPiece = nextB[r][c]!;

        // Check if this piece can jump further.
        const further = nextJumpTargets(nextB, r, c, landedPiece, newCaptured);
        if (further.length > 0) {
          // Still mid-jump — update board but don't end the turn.
          flashLand(r, c);
          setBoard(nextB);
          setSel([r, c]);
          setMidJump({
            piece: [r, c],
            alreadyCaptured: newCaptured,
            boardSoFar: nextB,
            originBoard: mj.originBoard,
            originTurn: mj.originTurn,
          });
        } else {
          // Jump chain complete — end the turn. History stores pre-chain board.
          finishTurn(nextB, mj.originBoard, mj.originTurn, r, c);
        }
      }
      // Clicking elsewhere during mid-jump does nothing.
      return;
    }

    const key = `${r},${c}`;
    if (sel) {
      if (destSet.has(key)) {
        const move = myMoves.find(
          (m) => m.from[0] === sel[0] && m.from[1] === sel[1] && m.to[0] === r && m.to[1] === c,
        )!;
        // Check if this is a multi-jump (more than one capture).
        if (move.captures.length > 1) {
          // Start step-by-step multi-jump. Execute first jump only.
          const firstCapture = move.captures[0];
          const { board: nextB } = applySingleJump(board, move.from, firstCapture);
          // Compute where we land after first jump.
          const [fr, fc] = move.from;
          const [cr, cc] = firstCapture;
          const lr = fr + 2 * (cr - fr);
          const lc = fc + 2 * (cc - fc);
          const landedPiece = nextB[lr][lc]!;
          const taken: [number, number][] = [firstCapture];
          const further = nextJumpTargets(nextB, lr, lc, landedPiece, taken);
          if (further.length > 0) {
            flashLand(lr, lc);
            setBoard(nextB);
            setSel([lr, lc]);
            setMidJump({
              piece: [lr, lc],
              alreadyCaptured: taken,
              boardSoFar: nextB,
              originBoard: board,
              originTurn: turn,
            });
          } else {
            // Only one actual jump despite captures.length > 1, finish normally.
            finishTurn(nextB, board, turn, lr, lc);
          }
          return;
        }
        // Single-capture or simple move.
        finishTurn(applyMove(board, move), board, turn, r, c);
        return;
      }
      if (fromSet.has(key)) return setSel([r, c]);
      return setSel(null);
    }
    if (fromSet.has(key)) setSel([r, c]);
  };

  // Bot (Black) replies — only in single-player.
  useEffect(() => {
    if (gameMode !== "single") return;
    if (turn !== "b" || over) return;
    setThinking(true);
    const id = setTimeout(() => {
      const m: Move | null = bestMove(board, "b", DEPTH[difficulty]);
      if (m) {
        setHistory((hh) => [...hh, { board, turn: "b" }]);
        setBoard(applyMove(board, m));
        flashLand(m.to[0], m.to[1]);
      }
      setTurn("r");
      setThinking(false);
    }, 350);
    return () => clearTimeout(id);
  }, [board, turn, over, difficulty, gameMode, flashLand]);

  const status = over
    ? gameMode === "two"
      ? winnerColor === "r"
        ? "Red wins!"
        : "Black wins!"
      : winnerColor === "r"
        ? "🎉 You win!"
        : "Bot wins"
    : thinking
      ? "Bot is thinking…"
      : midJump
        ? "Jump again!"
        : gameMode === "two"
          ? turn === "r"
            ? "Red's turn"
            : "Black's turn"
          : "Your move";

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "Click", desc: "Select piece, then click destination" },
        ]}
        tips={["Captures are mandatory — plan ahead", "Reach the far end to king your piece"]}
      />
    <div className="chess">
      <div className="sudoku-bar">
        <div className="seg">
          {gameMode === "single" && (["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`seg-btn${d === difficulty ? " active" : ""}`}
              onClick={() => setDifficulty(d)}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
          <button
            className={`seg-btn${gameMode === "two" ? " active" : ""}`}
            onClick={() => { setGameMode(gameMode === "two" ? "single" : "two"); newGame(); }}
          >
            2 Player
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={undo} disabled={thinking || !history.length}>
            ↶ Undo
          </button>
          <button className="btn ghost" onClick={newGame}>
            New
          </button>
        </div>
      </div>

      <div className="chess-status">{status}</div>

      <div className="ck-board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const key = `${r},${c}`;
            const isSel = sel && sel[0] === r && sel[1] === c;
            const isDest = destSet.has(key);
            const isJumpHint = jumpHintSet.has(key);
            const isLand = landCell === key;
            const cls = [
              "ck-sq",
              dark ? "dark" : "light",
              isSel ? "sel" : "",
              isDest ? "dest" : "",
              isJumpHint ? "ck-sq--jump-hint" : "",
              isLand ? "ck-sq--land" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={key} className={cls} onClick={() => onSquare(r, c)}>
                {cell ? (
                  <div className={`ck-piece ${cell.color}${cell.king ? " king" : ""}`}>
                    {cell.king ? "♛" : ""}
                  </div>
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          {gameMode === "two"
            ? "2-player mode — Red (bottom) vs Black (top)"
            : "You’re Red (bottom). Captures are mandatory · reach the far row to king."}
        </span>
      </div>
    </div>
      <GameLeaderboard
        game="checkers"
        value={moveCount}
        over={winnerColor === "r"}
        title="Checkers · moves to win"
      />
    </div>
  );
}
