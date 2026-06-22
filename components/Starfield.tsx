"use client";

import { useEffect, useState } from "react";

type Star = { x: number; y: number; size: number; dur: number; delay: number };

/** Subtle twinkling starfield behind the app — matches the landing page.
 *  Generated client-side after mount, so no SSR hydration mismatch. */
export function Starfield() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const n = Math.min(
      140,
      Math.floor((window.innerWidth * window.innerHeight) / 9000),
    );
    setStars(
      Array.from({ length: n }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1,
        dur: 2 + Math.random() * 4,
        delay: Math.random() * 4,
      })),
    );
  }, []);

  return (
    <div className="stars" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
