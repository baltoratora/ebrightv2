"use client";

// Root client component: owns the session (start a new run, or resume) and
// renders the StartScreen or a keyed RunScreen. A fresh `key` per session forces
// the game host to re-mount cleanly on new/again/resume. The --evo-* palette
// tokens are applied here so both screens (and their modals) inherit them.

import { useEffect, useState, type CSSProperties } from "react";
import type { Mode } from "@/lib/evolution/sim/state";
import { evoCssVars } from "@/lib/evolution/palette";
import { StartScreen } from "./StartScreen";
import { RunScreen } from "./RunScreen";
import { hasResumableSave, loadSave } from "./storage";
import styles from "./immersion/Immersion.module.css";

type Session = { key: number } & ({ mode: Mode } | { resume: string });

export function EvolveGame() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(hasResumableSave());
  }, []);

  let inner: React.ReactNode;
  if (!session) {
    inner = (
      <StartScreen
        hasSave={hasSave}
        onStart={(mode) => setSession({ key: Date.now(), mode })}
        onResume={() => {
          const raw = loadSave();
          if (raw) setSession({ key: Date.now(), resume: raw });
        }}
      />
    );
  } else {
    const init = "resume" in session ? { resume: session.resume } : { mode: session.mode, seed: makeSeed() };
    const exit = () => {
      setHasSave(hasResumableSave());
      setSession(null);
    };
    const again = () => setSession({ key: Date.now(), mode: "mode" in session ? session.mode : "survival" });
    inner = <RunScreen key={session.key} init={init} onExit={exit} onAgain={again} />;
  }

  return (
    <main className={`evo-app ${styles.shell}`} style={evoCssVars() as CSSProperties}>
      {inner}
    </main>
  );
}

// Seed generation happens in the browser layer (not the pure sim), so the sim
// stays deterministic given a seed.
function makeSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000) + 1;
}
