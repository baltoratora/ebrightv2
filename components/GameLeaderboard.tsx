"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTop,
  submitScore,
  qualifies,
  fmtValue,
  metaFor,
  type Entry,
} from "@/lib/leaderboard";

export function GameLeaderboard({
  game,
  value,
  over,
  title = "Leaderboard",
}: {
  game: string;
  value: number | null;
  over: boolean;
  title?: string;
}) {
  const [scores, setScores] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);
  const [name, setName] = useState("");
  const [highlight, setHighlight] = useState<number | null>(null);
  const handledRef = useRef(false);
  const meta = metaFor(game);

  const load = useCallback(async () => {
    setLoading(true);
    setScores(await fetchTop(game));
    setLoading(false);
  }, [game]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!over || value == null) {
      handledRef.current = false;
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;
    (async () => {
      const s = await fetchTop(game);
      setScores(s);
      if (qualifies(s, value, meta.dir)) setPromptOpen(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, value, game]);

  const save = async () => {
    if (value == null) return;
    setScores(await submitScore(game, name.trim() || "—", value));
    setHighlight(value);
    setPromptOpen(false);
    setName("");
  };

  return (
    <aside className="lb">
      <div className="lb-title">🏆 {title}</div>
      {loading ? (
        <div className="lb-empty">Loading…</div>
      ) : scores.length === 0 ? (
        <div className="lb-empty">No scores yet — be the first!</div>
      ) : (
        <ol className="lb-list">
          {scores.map((e, i) => (
            <li key={i} className={`lb-row${highlight != null && e.value === highlight ? " me" : ""}`}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{e.name}</span>
              <span className="lb-val">{fmtValue(game, e.value)}</span>
            </li>
          ))}
        </ol>
      )}

      {promptOpen && value != null ? (
        <div className="lb-modal" role="dialog" aria-modal="true">
          <div className="lb-modal-card">
            <div className="lb-modal-title">🏆 New high score!</div>
            <div className="lb-modal-val">{fmtValue(game, value)}</div>
            <input
              className="lb-input"
              maxLength={12}
              placeholder="Your name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
            <div className="lb-modal-actions">
              <button className="btn" onClick={save}>
                Save
              </button>
              <button className="btn ghost" onClick={() => setPromptOpen(false)}>
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
