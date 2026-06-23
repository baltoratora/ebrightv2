"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  scoreGuess,
  isValidWord,
  randomAnswers,
  bestStatus,
  WORD_LENGTH,
  type LetterStatus,
} from "@/lib/wordle";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function BoardGrid({
  target,
  isSolved,
  guesses,
  current,
  guessLimit,
  over,
}: {
  target: string;
  isSolved: boolean;
  guesses: string[];
  current: string;
  guessLimit: number;
  over: boolean;
}) {
  const rows = [];
  for (let r = 0; r < guessLimit; r++) {
    const guess = guesses[r];
    const score = guess != null ? scoreGuess(guess, target) : null;
    const isCurrentRow = r === guesses.length && !isSolved && !over;
    const cells = [];
    for (let i = 0; i < WORD_LENGTH; i++) {
      let ch = "";
      let cls = "wg-tile";
      if (guess != null && score) {
        ch = guess[i];
        cls += " " + score[i];
      } else if (isCurrentRow && i < current.length) {
        ch = current[i];
        cls += " filled";
      }
      cells.push(
        <div key={i} className={cls}>
          {ch}
        </div>,
      );
    }
    rows.push(
      <div key={r} className="wg-row">
        {cells}
      </div>,
    );
  }
  return <div className={`wg-grid${isSolved ? " solved" : ""}`}>{rows}</div>;
}

export function WordGame({
  boards,
  guessLimit,
}: {
  boards: number;
  guessLimit: number;
}) {
  const [targets, setTargets] = useState<string[]>(() => randomAnswers(boards));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [msg, setMsg] = useState("");

  const solved = useMemo(
    () => targets.map((t) => guesses.includes(t)),
    [targets, guesses],
  );
  const allSolved = solved.every(Boolean);
  const over = allSolved || guesses.length >= guessLimit;

  const newGame = useCallback(() => {
    setTargets(randomAnswers(boards));
    setGuesses([]);
    setCurrent("");
    setMsg("");
  }, [boards]);

  const flash = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 1200);
  }, []);

  const submit = useCallback(() => {
    if (over) return;
    setCurrent((cur) => {
      if (cur.length < WORD_LENGTH) {
        flash("Not enough letters");
        return cur;
      }
      if (!isValidWord(cur)) {
        flash("Not in word list");
        return cur;
      }
      setGuesses((g) => [...g, cur.toLowerCase()]);
      return "";
    });
  }, [over, flash]);

  const typeCh = useCallback(
    (ch: string) => {
      if (over) return;
      setCurrent((c) => (c.length < WORD_LENGTH ? c + ch : c));
    },
    [over],
  );
  const back = useCallback(() => setCurrent((c) => c.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") submit();
      else if (e.key === "Backspace") back();
      else if (/^[a-zA-Z]$/.test(e.key)) typeCh(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, back, typeCh]);

  // Aggregate keyboard hints across all boards/guesses.
  const keyStates = useMemo(() => {
    const map: Record<string, LetterStatus> = {};
    for (const guess of guesses) {
      for (const target of targets) {
        const sc = scoreGuess(guess, target);
        for (let i = 0; i < guess.length; i++) {
          map[guess[i]] = bestStatus(map[guess[i]], sc[i]);
        }
      }
    }
    return map;
  }, [guesses, targets]);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "A–Z", desc: "Type a letter" },
          { key: "Enter", desc: "Submit guess" },
          { key: "←", desc: "Delete letter" },
        ]}
        tips={["CRANE or SLATE covers the most common letters"]}
      />
    <div className="wg">
      <div className="sudoku-bar">
        <span className="wg-progress">
          {solved.filter(Boolean).length}/{boards} solved · {guesses.length}/
          {guessLimit} guesses
        </span>
        <button className="btn ghost" onClick={newGame}>
          New
        </button>
      </div>

      {msg ? <div className="wg-msg">{msg}</div> : null}

      <div className={`wg-boards${boards > 1 ? " quad" : ""}`}>
        {targets.map((t, i) => (
          <BoardGrid
            key={i}
            target={t}
            isSolved={solved[i]}
            guesses={guesses}
            current={current}
            guessLimit={guessLimit}
            over={over}
          />
        ))}
      </div>

      {over ? (
        <div className={`sudoku-win${allSolved ? "" : " lost"}`}>
          {allSolved
            ? "🎉 Solved!"
            : `${boards > 1 ? "Missed" : "The word was"}: ${targets
                .filter((_, i) => !solved[i])
                .join(", ")
                .toUpperCase()}`}
        </div>
      ) : null}

      <div className="wg-keyboard">
        {KEY_ROWS.map((row, ri) => (
          <div key={ri} className="wg-krow">
            {ri === 2 ? (
              <button className="wg-key wide" onClick={submit}>
                Enter
              </button>
            ) : null}
            {row.split("").map((ch) => (
              <button
                key={ch}
                className={`wg-key${keyStates[ch] ? " " + keyStates[ch] : ""}`}
                onClick={() => typeCh(ch)}
              >
                {ch}
              </button>
            ))}
            {ri === 2 ? (
              <button className="wg-key wide" onClick={back}>
                ⌫
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
      <GameLeaderboard
        game={boards === 1 ? "wordle" : "quordle"}
        value={guesses.length}
        over={allSolved}
        title={boards === 1 ? "Wordle" : "Quordle"}
      />
    </div>
  );
}
