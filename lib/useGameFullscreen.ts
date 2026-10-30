"use client";

import { useEffect, useRef, useState } from "react";

/** Expand the current game instance, with a viewport fallback for restricted browsers. */
export function useGameFullscreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestVersion = useRef(0);
  const requesting = useRef(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [windowFullscreen, setWindowFullscreen] = useState(false);
  const expanded = nativeFullscreen || windowFullscreen;

  useEffect(() => {
    const changed = () => setNativeFullscreen(document.fullscreenElement === containerRef.current);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestVersion.current++;
        setWindowFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", changed);
    window.addEventListener("keydown", escape);
    return () => {
      // This is a cancellation counter, not a DOM ref: invalidate the current request on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestVersion.current++;
      document.removeEventListener("fullscreenchange", changed);
      window.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (!windowFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [windowFullscreen]);

  const toggleFullscreen = async () => {
    if (expanded) {
      requestVersion.current++;
      setWindowFullscreen(false);
      if (document.fullscreenElement === containerRef.current) {
        try { await document.exitFullscreen(); } catch { /* Browser Escape still exits. */ }
      }
      return;
    }
    const container = containerRef.current;
    if (!container || requesting.current) return;
    const version = ++requestVersion.current;
    requesting.current = true;
    try {
      if (container.requestFullscreen && document.fullscreenEnabled) {
        try {
          await container.requestFullscreen();
          if (version !== requestVersion.current && document.fullscreenElement === container) await document.exitFullscreen();
          return;
        } catch { /* Use the browser window below. */ }
      }
      if (version === requestVersion.current && container.isConnected) setWindowFullscreen(true);
    } finally {
      requesting.current = false;
    }
  };

  return { containerRef, expanded, windowFullscreen, toggleFullscreen };
}
