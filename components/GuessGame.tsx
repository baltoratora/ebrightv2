"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/guess-categories";
import {
  evaluateGuess,
  candidateRange,
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
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
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
    const storedStats = lsGet<Stats>(statsKey(cat.id));
    setStats(storedStats && (Object.keys(ZERO_STATS) as (keyof Stats)[]).every((key) => Number.isInteger(storedStats[key]) && storedStats[key] >= 0) ? storedStats : ZERO_STATS);
    const saved = lsGet<SavedGame>(gameKey(cat.id));
    if (saved && saved.status === "playing" && cat.items.includes(saved.answer) && Array.isArray(saved.guesses) && saved.guesses.every((g) => cat.items.includes(g)) && new Set(saved.guesses).size === saved.guesses.length && !saved.guesses.includes(saved.answer)) {
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
    setActiveSuggestion(-1);
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
    if (!window.confirm("Reveal the answer and end this round?")) return;
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
    () => (cat && status === "playing" ? suggest(input, cat, 12).filter((s) => !guesses.includes(s)).slice(0, 6) : []),
    [input, cat, status, guesses]
  );

  const rows = useMemo(
    () =>
      [...guesses]
        .sort((a, b) => a.localeCompare(b, "en"))
        .map((g) => evaluateGuess(g, answer, sorted)),
    [guesses, answer, sorted]
  );

  const range = candidateRange(sorted, rows);

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
      <div className="guess-range" role="status">
        <span>{status === "playing" ? "Your answer is in this A–Z range" : "Round complete"}</span>
        <strong>{range ? range.first === range.last ? range.first : `${range.first} → ${range.last}` : "Choose another category"}</strong>
        <span>{range?.count ?? 0} possibilities · {guesses.length} guesses</span>
        <progress value={sorted.length - (range?.count ?? sorted.length)} max={sorted.length} aria-label="Search narrowed" />
      </div>
      <p className="guess-caption">▲ earlier · ▼ later · number = places away</p>

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

      <details className="guess-rules"><summary>About this category</summary><p>{cat.note}</p></details>
      <ul className="guess-list" aria-label="Your guesses">
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
          {suggestionsOpen && suggestions.length > 0 && input && (
            <ul className="guess-suggest" id="guess-suggestions" role="listbox" aria-label="Suggested guesses">
              {suggestions.map((s, i) => (
                <li key={s} id={`guess-option-${i}`} role="option" aria-selected={activeSuggestion === i}>
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
              submit(suggestionsOpen && activeSuggestion >= 0 && suggestions[activeSuggestion] ? suggestions[activeSuggestion] : input);
            }}
          >
            <input
              ref={inputRef}
              className="guess-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setMessage("");
                setActiveSuggestion(-1);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && suggestions.length) { e.preventDefault(); setSuggestionsOpen(true); setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1)); }
                else if (e.key === "ArrowUp" && suggestions.length) { e.preventDefault(); setActiveSuggestion((i) => Math.max(i - 1, 0)); }
                else if (e.key === "Escape") { setSuggestionsOpen(false); setActiveSuggestion(-1); }
              }}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={!!(suggestionsOpen && input && suggestions.length)}
              aria-controls="guess-suggestions"
              aria-activedescendant={suggestionsOpen && activeSuggestion >= 0 && suggestions[activeSuggestion] ? `guess-option-${activeSuggestion}` : undefined}
              autoCapitalize="none"
              spellCheck={false}
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
