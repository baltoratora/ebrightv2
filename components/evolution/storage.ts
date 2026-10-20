// Resilient localStorage access for the Evolve save slot. Every call is guarded
// so an unavailable store (private mode, quota, disabled) never crashes the game
// (spec correction: handle unavailable storage, failed writes, invalid saves).

import { deserialize } from "@/lib/evolution/save/save";

const KEY = "evolve:save";

export function loadSave(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeSave(s: string): boolean {
  try {
    localStorage.setItem(KEY, s);
    return true;
  } catch {
    return false; // quota / disabled — caller continues without persistence
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// A resumable save exists only if it is present AND validates at runtime.
export function hasResumableSave(): boolean {
  const raw = loadSave();
  if (!raw) return false;
  try {
    return deserialize(raw).state !== null;
  } catch {
    return false;
  }
}
