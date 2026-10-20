"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Random deals/piece bags start only after hydration, never in exported HTML. */
export function ClientGame({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return mounted ? children : <div className="game-loading" role="status">Preparing your game…</div>;
}
