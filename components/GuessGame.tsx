"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/guess-categories";
import {
  evaluateGuess,
  pickAnswer,
  resolveGuess,
  sortedItems,
  suggest,
  type Category,
  type GuessRow,
} from "@/lib/guess";

type Status = "playing" | "won" | "gaveup";

type Stats = {
  gamesPlayed: number;
  wins: number;
  gaveUp: number;
  totalGuessesOnWins: number;
};

type SavedGame = { answer: string; guesses: string[]; status: Status };

const ZERO_STATS: Stats = { gamesPlayed: 0, wins: 0, gaveUp: 0, totalGuessesOnWins: 0 };

function gameKey(catId: string) {
  return `baltoratora:guess:${catId}:game`;
}
function statsKey(catId: string) {
  return `baltoratora:guess:${catId}:stats`;
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore quota / disabled storage */
  }
}

const ARROW: Record<GuessRow["dir"], string> = { up: "▲", down: "▼", hit: "★" };
const DIR_WORD: Record<GuessRow["dir"], string> = {
  up: "earlier",
  down: "later",
  hit: "correct",
};

export function GuessGame() {
  const [catId, setCatId] = useState<string | null>(null);
  const cat = useMemo<Category | null>(
    () => CATEGORIES.find((c) => c.id === catId) ?? null,
    [catId]
  );
  const sorted = useMemo(() => (cat ? sortedItems(cat) : []), [cat]);

  const [answer, setAnswer] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [announce, setAnnounce] = useState("");
  const [stats, setStats] = useState<Stats>(ZERO_STATS);
  const inputRef = useRef<HTMLInputElement>(null);
  const initedFor = useRef<string | null>(null);

  // Load stats + resume (or start) a round when a category is chosen.
  // Guarded so it initializes exactly once per category selection (idempotent
  // under React StrictMode double-invoke and any spurious re-run).
  useEffect(() => {
    if (!cat) {
      initedFor.current = null;
      return;
    }
    if (initedFor.current === cat.id) return;
    initedFor.current = cat.id;
    setStats(lsGet<Stats>(statsKey(cat.id)) ?? ZERO_STATS);
    const saved = lsGet<SavedGame>(gameKey(cat.id));
    if (saved && saved.status === "playing" && cat.items.includes(saved.answer)) {
      setAnswer(saved.answer);
      setGuesses(saved.guesses);
      setStatus("playing");
    } else {
      startRound(cat, saved?.answer);
    }
    setInput("");
    setMessage("");
    setAnnounce("");
  }, [cat]);

  function persistGame(a: string, g: string[], s: Status) {
    if (!cat) return;
    lsSet(gameKey(cat.id), { answer: a, guesses: g, status: s } satisfies SavedGame);
  }

  function startRound(c: Category, exclude?: string) {
    const items = sortedItems(c);
    const a = pickAnswer(items, { exclude });
    setAnswer(a);
    setGuesses([]);
    setStatus("playing");
    setInput("");
    setMessage("");
    setAnnounce("");
    lsSet(gameKey(c.id), { answer: a, guesses: [], status: "playing" } satisfies SavedGame);
  }

  function bumpStats(update: (prev: Stats) => Stats) {
    if (!cat) return;
    setStats((prev) => {
      const merged = update(prev);
      lsSet(statsKey(cat.id), merged);
      return merged;
    });
  }

  function submit(rawOrItem: string) {
    if (!cat || status !== "playing") return;
    const resolved = resolveGuess(rawOrItem, cat);
    if (!resolved) {
      setMessage("Not in this list — try another");
      setAnnounce("Not in this list. Try another.");
      return;
    }
    if (guesses.includes(resolved)) {
      setMessage("Already guessed");
      setAnnounce(`${resolved}. Already guessed.`);
      setInput("");
      return;
    }
    const row = evaluateGuess(resolved, answer, sorted);
    const nextGuesses = [...guesses, resolved];
    setGuesses(nextGuesses);
    setInput("");
    setMessage("");

    if (row.dir === "hit") {
      setStatus("won");
      persistGame(answer, nextGuesses, "won");
      bumpStats((prev) => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        wins: prev.wins + 1,
        totalGuessesOnWins: prev.totalGuessesOnWins + nextGuesses.length,
      }));
      setAnnounce(`${resolved}, correct! Solved in ${nextGuesses.length} guesses.`);
    } else {
      persistGame(answer, nextGuesses, "playing");
      setAnnounce(`${resolved}, ${row.distance}, ${DIR_WORD[row.dir]} in the list.`);
    }
  }

  function giveUp() {
    if (!cat || status !== "playing") return;
    setStatus("gaveup");
    persistGame(answer, guesses, "gaveup");
    bumpStats((prev) => ({ ...prev, gamesPlayed: prev.gamesPlayed + 1, gaveUp: prev.gaveUp + 1 }));
    setAnnounce(`Gave up. The answer was ${answer}.`);
  }

  function playAgain() {
    if (cat) startRound(cat, answer);
    inputRef.current?.focus();
  }

  const suggestions = useMemo(
    () => (cat && status === "playing" ? suggest(input, cat, 8) : []),
    [input, cat, status]
  );

  const rows = useMemo(
    () =>
      [...guesses]
        .sort((a, b) => a.localeCompare(b, "en"))
        .map((g) => evaluateGuess(g, answer, sorted)),
    [guesses, answer, sorted]
  );

  const avg = stats.wins > 0 ? (stats.totalGuessesOnWins / stats.wins).toFixed(1) : "—";

  // ---- Category picker ----
  if (!cat) {
    return (
      <div className="guess">
        <p className="guess-caption">Pick a category — then guess the hidden item.</p>
        <div className="games">
          {CATEGORIES.map((c) => (
            <button key={c.id} className="game-card" onClick={() => setCatId(c.id)}>
              <span className="game-icon">{c.emoji}</span>
              <span className="game-name">{c.label}</span>
              <span className="game-desc">{c.items.length} items</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Play screen ----
  return (
    <div className="guess">
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      <div className="guess-topbar">
        <span className="guess-cat">
          {cat.emoji} {cat.label}
        </span>
        <span className="guess-stats">
          W {stats.wins} · avg {avg}
        </span>
      </div>
      <p className="guess-caption">Guesses are arranged alphabetically</p>

      {status === "won" && (
        <div className="guess-banner guess-banner--win">
          Solved in {guesses.length}! The answer was <strong>{answer}</strong>.
        </div>
      )}
      {status === "gaveup" && (
        <div className="guess-banner guess-banner--over">
          The answer was <strong>{answer}</strong>.
        </div>
      )}

      <ul className="guess-list">
        {rows.map((r) => (
          <li key={r.item} className={`guess-row guess-row--${r.dir === "hit" ? "hit" : r.bucket}`}>
            <span className="guess-item">{r.item}</span>
            <span className="guess-dist">
              {r.dir === "hit" ? ARROW.hit : `${r.distance} ${ARROW[r.dir]}`}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="guess-empty">No guesses yet.</li>}
      </ul>

      {status === "playing" ? (
        <div className="guess-inputbar">
          {message && <div className="guess-msg">{message}</div>}
          {suggestions.length > 0 && input && (
            <ul className="guess-suggest">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => submit(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <input
              ref={inputRef}
              className="guess-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setMessage("");
              }}
              placeholder={`Guess a ${cat.label.toLowerCase().replace(/s$/, "")}…`}
              autoComplete="off"
              aria-label={`Guess a ${cat.label}`}
            />
            <button className="guess-submit" type="submit">
              Guess
            </button>
          </form>
          <div className="guess-controls">
            <button className="guess-ctl" onClick={giveUp}>
              Give up
            </button>
            <button className="guess-ctl" onClick={() => setCatId(null)}>
              Change category
            </button>
          </div>
        </div>
      ) : (
        <div className="guess-controls">
          <button className="guess-ctl guess-ctl--primary" onClick={playAgain}>
            Play again
          </button>
          <button className="guess-ctl" onClick={() => setCatId(null)}>
            Change category
          </button>
        </div>
      )}
    </div>
  );
}
