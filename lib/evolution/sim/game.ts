// Framework-free game host: owns a SimState, advances it in fixed SIM_DT steps
// scaled by speed, routes actions through the shared reducers, and (de)serialises
// via save.ts. The React hook wraps this; keeping it pure makes it unit-testable
// and keeps catch-up/pause logic independent of rAF.

import type { DifficultyParams } from "./difficulty";
import { NORMAL } from "./difficulty";
import type { Mode, Difficulty, SimState } from "./state";
import { initialState } from "./state";
import { makeRng } from "./rng";
import { tick } from "./tick";
import { applyAction, type Action } from "./actions";
import { serialize, deserialize } from "../save/save";

export interface Game {
  readonly state: SimState;
  readonly speed: number;
  dispatch(a: Action): void;
  advance(realMs: number): void;
  setSpeed(n: number): void;
  pause(): void;
  serialize(): string;
}

export interface CreateGameOpts {
  mode?: Mode;
  seed?: number;
  difficulty?: Difficulty;
  resume?: string; // serialized save
  params?: DifficultyParams;
}

export function createGame(opts: CreateGameOpts): Game {
  const params = opts.params ?? NORMAL;
  let state: SimState;
  if (opts.resume) {
    const r = deserialize(opts.resume);
    if (!r.state) throw new Error(`cannot resume: ${r.error ?? "invalid"}`);
    state = r.state;
  } else {
    state = initialState({ mode: opts.mode ?? "survival", rngSeed: opts.seed ?? 1, difficulty: opts.difficulty });
  }

  let speed = 1;
  let acc = 0; // banked sim-seconds

  const runnable = () => state.status === "running" && !state.paused && !state.pendingDecision;

  return {
    get state() {
      return state;
    },
    get speed() {
      return speed;
    },
    dispatch(a) {
      state = applyAction(state, a, params).state;
    },
    setSpeed(n) {
      speed = n;
    },
    pause() {
      state = applyAction(state, { type: "pause" }, params).state;
      acc = 0; // drop banked time so resuming never jumps
    },
    advance(realMs) {
      // not runnable → drop any accumulated time (no catch-up on resume)
      if (!runnable()) {
        acc = 0;
        return;
      }
      acc += (realMs / 1000) * speed;
      let guard = 0;
      while (acc >= params.SIM_DT - 1e-9 && runnable() && guard++ < 100000) {
        state = tick(state, makeRng(state.rngSeed, state.rngCursor), params);
        acc -= params.SIM_DT;
      }
      // a decision/transition/terminal fired mid-advance → clear the remainder
      if (!runnable()) acc = 0;
    },
    serialize() {
      return serialize(state);
    },
  };
}
