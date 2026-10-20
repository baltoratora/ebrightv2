"use client";

// React host for the framework-free game core. Runs a fixed-step rAF loop
// (speed-scaled, frame-capped so a backgrounded tab can't bank catch-up time),
// pauses on hidden tab, and autosaves at decision points. All game logic lives
// in the shared reducers/core — this file only bridges to React + the browser.

import { useRef, useState, useEffect, useCallback } from "react";
import { createGame, type Game } from "@/lib/evolution/sim/game";
import type { Action } from "@/lib/evolution/sim/actions";
import type { Mode } from "@/lib/evolution/sim/state";
import { writeSave } from "./storage";

export interface EvolveGameInit {
  mode?: Mode;
  seed?: number;
  resume?: string;
}

export function useEvolveGame(init: EvolveGameInit) {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) {
    gameRef.current = init.resume
      ? createGame({ resume: init.resume })
      : createGame({ mode: init.mode ?? "survival", seed: init.seed ?? 1 });
  }
  const [, setFrame] = useState(0);
  const rerender = useCallback(() => setFrame((n) => (n + 1) % 1_000_000), []);

  // fixed-step loop
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      if (last === 0) last = ts;
      let delta = ts - last;
      last = ts;
      if (delta > 250) delta = 250; // cap one frame → no catch-up after a stall/background
      const g = gameRef.current!;
      const before = g.state;
      g.advance(delta);
      if (g.state !== before) rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rerender]);

  // pause (and persist) when the tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        gameRef.current!.pause();
        writeSave(gameRef.current!.serialize());
        rerender();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [rerender]);

  // Test-only acceleration hook: DEVELOPMENT builds only, and additionally gated
  // behind ?test=1. The `process.env.NODE_ENV` check is statically replaced at
  // build time, so this entire block (and the `__evolve` symbol) is dead-code
  // eliminated from production bundles — `?test=1` can never expose it in prod.
  // It only calls the real advance()/reads state, so simulation rules are
  // preserved (headless browser tests drive legal UI clicks for decisions).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("test") !== "1") return;
    const w = window as unknown as { __evolve?: unknown };
    w.__evolve = {
      advance: (ms: number) => {
        gameRef.current!.advance(ms);
        rerender();
      },
      state: () => gameRef.current!.state,
    };
    return () => {
      delete (window as unknown as { __evolve?: unknown }).__evolve;
    };
  }, [rerender]);

  const g = gameRef.current;

  // autosave at decision points (pause / pending / period / status changes)
  useEffect(() => {
    writeSave(g.serialize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.state.paused, g.state.pendingDecision?.id, g.state.clock.period, g.state.status]);

  const dispatch = useCallback(
    (a: Action) => {
      gameRef.current!.dispatch(a);
      writeSave(gameRef.current!.serialize());
      rerender();
    },
    [rerender],
  );
  const setSpeed = useCallback(
    (n: number) => {
      gameRef.current!.setSpeed(n);
      rerender();
    },
    [rerender],
  );

  return { state: g.state, speed: g.speed, dispatch, setSpeed };
}
