"use client";

import { useState } from "react";

function roll() {
  return Math.floor(Math.random() * 99) + 1;
}

export function RngWidget() {
  const [num, setNum] = useState(roll);

  return (
    <div className="fact rng-widget">
      <span className="icon">🎲</span>
      <div className="fact-body">
        <div className="label">Random number (1–99)</div>
        <div className="rng-number">{num}</div>
      </div>
      <button
        className="fact-refresh"
        onClick={() => setNum(roll())}
        aria-label="Roll new number"
        title="Roll new number"
      >
        ↻
      </button>
    </div>
  );
}
