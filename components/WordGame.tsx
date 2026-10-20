"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scoreGuess, isValidWord, randomAnswers, bestStatus, WORD_LENGTH, type LetterStatus } from "@/lib/wordle";
import { readWordSession } from "@/lib/word-session";
import { ignoreGameKey } from "@/lib/game-input";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function BoardGrid({ target, guesses, current, guessLimit, over, index, active }: {
  target: string; guesses: string[]; current: string; guessLimit: number; over: boolean; index: number; active: boolean;
}) {
  const solvedAt = guesses.indexOf(target);
  const solved = solvedAt >= 0;
  return (
    <section className={`wg-board${active ? " active" : ""}`} aria-label={`Word ${index + 1}${solved ? ", solved" : ""}`}>
      <div className="wg-board-label">Word {index + 1}<span>{solved ? `✓ ${solvedAt + 1} guesses` : "In progress"}</span></div>
      <div className={`wg-grid${solved ? " solved" : ""}`}>
        {Array.from({ length: guessLimit }, (_, r) => {
          const guess = solved && r > solvedAt ? undefined : guesses[r];
          const score = guess ? scoreGuess(guess, target) : null;
          const isCurrent = r === guesses.length && !solved && !over;
          return <div key={r} className={`wg-row${isCurrent ? " current" : ""}`}>
            {Array.from({ length: WORD_LENGTH }, (_, i) => {
              const ch = guess?.[i] ?? (isCurrent ? current[i] ?? "" : "");
              const status = score?.[i];
              return <div key={i} className={`wg-tile${status ? ` ${status}` : ch ? " filled" : ""}`}
                aria-label={`Row ${r + 1}, letter ${i + 1}: ${ch ? `${ch.toUpperCase()}${status ? `, ${status}` : ""}` : "empty"}`}>{ch}</div>;
            })}
          </div>;
        })}
      </div>
    </section>
  );
}

export function WordGame({ boards, guessLimit }: { boards: number; guessLimit: number }) {
  const [targets, setTargets] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [activeBoard, setActiveBoard] = useState(0);
  const [msg, setMsg] = useState("");
  const currentRef = useRef(current);
  currentRef.current = current;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `baltoratora:words:${boards}:v1`;
  const ready = targets.length === boards;
  const solved = useMemo(() => targets.map((t) => guesses.includes(t)), [targets, guesses]);
  const allSolved = ready && solved.every(Boolean);
  const over = allSolved || guesses.length >= guessLimit;

  useEffect(() => {
    try {
      const saved = readWordSession(JSON.parse(localStorage.getItem(storageKey) ?? "null"), boards, guessLimit);
      if (saved) {
        setTargets(saved.targets); setGuesses(saved.guesses); setCurrent(saved.current);
        return;
      }
    } catch { /* storage may be unavailable */ }
    setTargets(randomAnswers(boards));
  }, [storageKey, boards, guessLimit]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ targets, guesses, current })); } catch {}
  }, [targets, guesses, current, ready, storageKey]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const newGame = () => {
    if (!over && (guesses.length > 0 || current.length > 0) && !window.confirm("Start a new round? Your current word puzzle will be replaced.")) return;
    setTargets(randomAnswers(boards)); setGuesses([]); setCurrent(""); setMsg(""); setActiveBoard(0);
  };
  const flash = useCallback((message: string) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setMsg(message);
    flashTimer.current = setTimeout(() => setMsg(""), 2200);
  }, []);

  const submit = useCallback(() => {
    if (!ready || over) return;
    const cur = currentRef.current;
    if (cur.length !== WORD_LENGTH) return flash("Enter five letters first.");
    if (!isValidWord(cur)) return flash("That word isn’t in the list. Try another.");
    if (guesses.includes(cur)) return flash("You already tried that word.");
    setGuesses((g) => [...g, cur]); setCurrent(""); currentRef.current = ""; setMsg("");
    // Move the phone view to another unfinished word after solving the focused board.
    if (targets[activeBoard] === cur) {
      const next = targets.findIndex((t) => t !== cur && !guesses.includes(t));
      if (next >= 0) setActiveBoard(next);
    }
  }, [ready, over, flash, guesses, targets, activeBoard]);
  const typeCh = useCallback((ch: string) => {
    if (ready && !over) setCurrent((c) => c.length < WORD_LENGTH ? c + ch : c);
  }, [ready, over]);
  const back = useCallback(() => { if (!over) setCurrent((c) => c.slice(0, -1)); }, [over]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreGameKey(e)) return;
      if (e.key === "Enter") {
        // A focused button owns Enter; let its native activation run exactly once.
        if ((e.target as Element)?.closest("button, a, [role='button']")) return;
        e.preventDefault(); submit();
      } else if (e.key === "Backspace") { e.preventDefault(); back(); }
      else if (/^[a-zA-Z]$/.test(e.key)) typeCh(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, back, typeCh]);

  const keyStates = useMemo(() => {
    const map: Record<string, LetterStatus> = {};
    const target = targets[activeBoard];
    if (!target) return map;
    for (const guess of guesses) {
      const score = scoreGuess(guess, target);
      for (let i = 0; i < guess.length; i++) map[guess[i]] = bestStatus(map[guess[i]], score[i]);
    }
    return map;
  }, [guesses, targets, activeBoard]);

  return (
    <div className="game-layout">
      <GameInfo controls={[{ key: "A–Z", desc: "Type a letter or tap the keyboard" }, { key: "Enter", desc: "Submit a five-letter word" }, { key: "⌫", desc: "Delete a letter" }]}
        tips={["Green: right place. Gold: another place. Grey: not in this word.", ...(boards > 1 ? ["Each guess goes to all four words. Select a word to see its keyboard clues."] : []), "Your round saves automatically on this device."]} />
      <div className={`wg${boards > 1 ? " wg--quad" : ""}`}>
        <div className="sudoku-bar"><span className="wg-progress" role="status">{guesses.length} / {guessLimit} guesses{boards > 1 ? ` · ${solved.filter(Boolean).length} / ${boards} solved` : ""}</span>
          <button className="btn ghost" onClick={newGame}>New round</button></div>
        {boards > 1 && <div className="wg-board-tabs" role="group" aria-label="Select word and keyboard clues">
          {targets.map((_, i) => <button key={i} aria-pressed={activeBoard === i} onClick={() => setActiveBoard(i)}>Word {i + 1}{solved[i] ? " ✓" : ""}</button>)}
        </div>}
        <div className="wg-feedback" role="status" aria-live="polite">{msg || (over ? allSolved ? "All solved. Beautifully done!" : `Answer${boards > 1 ? "s" : ""}: ${targets.filter((_, i) => !solved[i]).join(", ").toUpperCase()}` : "")}</div>
        {!ready ? <p role="status">Loading your round…</p> : <div className={`wg-boards${boards > 1 ? " quad" : ""}`}>
          {targets.map((t, i) => <BoardGrid key={i} target={t} guesses={guesses} current={current} guessLimit={guessLimit} over={over} index={i} active={activeBoard === i} />)}
        </div>}
        <div className="wg-keyboard" aria-label={`On-screen keyboard${boards > 1 ? `, clues for Word ${activeBoard + 1}` : ""}`}>
          <span className="wg-key-hint">{boards > 1 ? `Keyboard clues · Word ${activeBoard + 1}` : "Green: right place · Gold: wrong place"}</span>
          {KEY_ROWS.map((row, ri) => <div key={row} className="wg-krow">
            {ri === 2 && <button className="wg-key wide" onClick={submit} disabled={!ready || over}>Enter</button>}
            {row.split("").map((ch) => <button key={ch} className={`wg-key${keyStates[ch] ? ` ${keyStates[ch]}` : ""}`} onClick={() => typeCh(ch)} disabled={!ready || over}
              aria-label={`${ch.toUpperCase()}${keyStates[ch] ? `, ${keyStates[ch]}` : ""}`}>{ch}</button>)}
            {ri === 2 && <button className="wg-key wide" aria-label="Delete letter" onClick={back} disabled={!ready || over}>⌫</button>}
          </div>)}
        </div>
      </div>
      <GameLeaderboard game={boards === 1 ? "wordle" : "quordle"} value={guesses.length} over={allSolved} title={boards === 1 ? "Wordle" : "Quordle"} />
    </div>
  );
}
