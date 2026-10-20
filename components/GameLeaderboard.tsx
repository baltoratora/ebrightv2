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
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
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
      setPromptOpen(false); // close stale modal on game reset
      setSaveError(false);
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

  useEffect(() => {
    if (!promptOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) { event.preventDefault(); setPromptOpen(false); }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)")];
      const first = controls[0]; const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [promptOpen]);

  const save = async () => {
    if (value == null || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const updated = await submitScore(game, name.trim() || "—", value);
      setScores(updated);
      setHighlight(value);
      setPromptOpen(false);
      setName("");
    } catch {
      // Keep the modal open and the current scores intact so the player can
      // retry — never wipe the board or drop the score on a transient failure.
      setSaveError(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <aside className="lb">
      <details className="lb-disclosure">
      <summary>Leaderboard <span aria-hidden="true">+</span></summary>
      <div className="lb-title">{title}</div>
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

      </details>

      {promptOpen && value != null ? (
        <div
          className="lb-modal"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lb-modal-title"
        >
          <div className="lb-modal-card">
            <div className="lb-modal-title" id="lb-modal-title">
              🏆 New high score!
            </div>
            <div className="lb-modal-val">{fmtValue(game, value)}</div>
            <input
              className="lb-input"
              maxLength={12}
              placeholder="Your name"
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
            {saveError && (
              <div
                role="alert"
                style={{ color: "var(--accent)", fontSize: "0.85rem", marginTop: 6 }}
              >
                Couldn&apos;t save — try again.
              </div>
            )}
            <div className="lb-modal-actions">
              <button className="btn" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="btn ghost" onClick={() => setPromptOpen(false)} disabled={saving}>
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
