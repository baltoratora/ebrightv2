"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nextSequence, checkInput, type Pad } from "@/lib/simon";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

// Classic Simon pad colours: [base, lit]
const PAD_COLORS: [string, string][] = [
  ["#16a34a", "#4ade80"], // 0 green  (top-left)
  ["#b91c1c", "#f87171"], // 1 red    (top-right)
  ["#a16207", "#fbbf24"], // 2 yellow (bottom-left)
  ["#1d4ed8", "#60a5fa"], // 3 blue   (bottom-right)
];

// Tone frequencies for each pad (Hz)
const PAD_FREQS = [329, 261, 415, 196];

const LS_KEY = "simon_best";

type Phase = "idle" | "showing" | "input" | "over";

/** Play a short oscillator tone. Guard for environments without AudioContext. */
function playTone(freq: number, durationMs: number) {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    const dur = durationMs / 1000;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    osc.onended = () => { try { ctx.close(); } catch { /* ignore */ } };
  } catch {
    // No AudioContext — silently ignore
  }
}

export function Simon() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seq, setSeq] = useState<Pad[]>([]);
  const [inputBuf, setInputBuf] = useState<Pad[]>([]);
  const [round, setRound] = useState(0);
  const [litPad, setLitPad] = useState<Pad | null>(null);
  const [best, setBest] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load best from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setBest(parseInt(raw, 10) || 0);
    } catch { /* ignore */ }
  }, []);

  // Clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  /** Flash the entire sequence one pad at a time, then hand control to player. */
  const flashSequence = useCallback(
    (sequence: Pad[], speed = 600) => {
      clearTimers();
      setPhase("showing");
      setInputBuf([]);
      setLitPad(null);

      const onTime = Math.max(120, Math.round(speed * 0.6));
      const offTime = Math.max(80, Math.round(speed * 0.4));

      let t = 350; // brief pause before first flash

      sequence.forEach((pad) => {
        const onT = setTimeout(() => {
          setLitPad(pad);
          playTone(PAD_FREQS[pad], onTime);
        }, t);
        timersRef.current.push(onT);
        t += onTime;

        const offT = setTimeout(() => setLitPad(null), t);
        timersRef.current.push(offT);
        t += offTime;
      });

      const doneT = setTimeout(() => {
        setPhase("input");
      }, t + 200);
      timersRef.current.push(doneT);
    },
    [clearTimers],
  );

  const startGame = useCallback(() => {
    clearTimers();
    const newSeq = nextSequence([]); // uses Math.random internally (event handler)
    setSeq(newSeq);
    setInputBuf([]);
    setRound(0);
    flashSequence(newSeq, 600);
  }, [clearTimers, flashSequence]);

  const handlePadClick = useCallback(
    (pad: Pad) => {
      if (phase !== "input") return;

      // Brief visual + audio feedback for the tap
      setLitPad(pad);
      playTone(PAD_FREQS[pad], 180);
      const litOff = setTimeout(() => setLitPad(null), 160);
      timersRef.current.push(litOff);

      const newInput = [...inputBuf, pad];
      const result = checkInput(seq, newInput);

      if (result === "wrong") {
        clearTimers();
        setPhase("over");
        setInputBuf([]);
        setBest((prev) => {
          const newBest = Math.max(prev, round);
          try { localStorage.setItem(LS_KEY, String(newBest)); } catch { /* ignore */ }
          return newBest;
        });
        return;
      }

      if (result === "complete") {
        const newRound = round + 1;
        setRound(newRound);
        const newSeq = nextSequence(seq); // event handler — Math.random OK
        setSeq(newSeq);
        setInputBuf([]);
        // Flash speed: starts 600ms, drops 15ms/round, floor 200ms
        const speed = Math.max(200, 600 - newRound * 15);
        const t = setTimeout(() => flashSequence(newSeq, speed), 400);
        timersRef.current.push(t);
        return;
      }

      // "ok" — partial match, keep going
      setInputBuf(newInput);
    },
    [phase, seq, inputBuf, round, clearTimers, flashSequence],
  );

  const gameOver = phase === "over";

  return (
    <div className="game-layout">
      <GameInfo
        controls={[{ key: "Click / Tap", desc: "Press a pad to repeat the pattern" }]}
        tips={[
          "Watch the full sequence before clicking",
          "Speed increases every round",
        ]}
      />

      <div className="simon-root">
        <div className="simon-header">
          <div className="simon-stat">
            <span className="simon-stat-label">ROUND</span>
            <span className="simon-stat-val">{round}</span>
          </div>
          <div className="simon-stat">
            <span className="simon-stat-label">BEST</span>
            <span className="simon-stat-val">{best}</span>
          </div>
        </div>

        <div className="simon-board">
          {([0, 1, 2, 3] as Pad[]).map((pad) => (
            <button
              key={pad}
              className={`simon-pad simon-pad--${pad}${litPad === pad ? " simon-pad--lit" : ""}`}
              onClick={() => handlePadClick(pad)}
              disabled={phase !== "input"}
              aria-label={`Pad ${pad + 1}`}
              style={{
                background: litPad === pad ? PAD_COLORS[pad][1] : PAD_COLORS[pad][0],
                boxShadow:
                  litPad === pad
                    ? `0 0 28px ${PAD_COLORS[pad][1]}`
                    : "none",
              }}
            />
          ))}

          {(phase === "idle" || phase === "over") && (
            <div className="simon-overlay" aria-live="polite">
              {phase === "over" && (
                <>
                  <div className="simon-over-msg">Game Over</div>
                  <div className="simon-over-sub">Round {round} reached</div>
                </>
              )}
              <button className="btn" onClick={startGame}>
                {phase === "idle" ? "Start" : "Play Again"}
              </button>
            </div>
          )}
        </div>

        <div className="simon-status" aria-live="polite">
          {phase === "showing" && "Watch the sequence…"}
          {phase === "input" && "Your turn!"}
          {phase === "idle" && "Press Start to play"}
          {phase === "over" && ""}
        </div>
      </div>

      <GameLeaderboard game="simon" value={round} over={gameOver} title="Simon Says" />
    </div>
  );
}
