"use client";

import { useCallback, useEffect, useState } from "react";
import { QUOTES, indexForDay, randomIndexExcluding } from "@/lib/quotes";

export function QuoteOfDay() {
  // `index` is the single source of truth; the quote is derived from it.
  const [index, setIndex] = useState<number | null>(null);

  // Resolve after mount: the day's quote depends on the client's date, so
  // computing it during static-export render would risk a hydration mismatch
  // (FunFact likewise resolves its content on the client).
  useEffect(() => {
    const day = Math.floor(Date.now() / 86_400_000); // days since the epoch
    setIndex(indexForDay(day, QUOTES.length));
  }, []);

  const another = useCallback(() => {
    setIndex((prev) =>
      randomIndexExcluding(prev ?? 0, QUOTES.length, Math.random()),
    );
  }, []);

  const quote = index === null ? null : QUOTES[index];

  return (
    <div className="quote">
      <span className="icon">📜</span>
      <div className="quote-body">
        <div className="label">Quote of the day</div>
        {quote ? (
          <>
            <blockquote className="text">{quote.text}</blockquote>
            <cite className="author">
              — {quote.author}
              {quote.origin ? (
                <span className="origin"> · {quote.origin}</span>
              ) : null}
            </cite>
          </>
        ) : (
          <div className="shimmer" style={{ height: 22, width: "80%" }} />
        )}
      </div>
      <button
        className="fact-refresh"
        onClick={another}
        disabled={!quote}
        aria-label="Show another quote"
        title="Show another quote"
      >
        <span>↻</span>
      </button>
    </div>
  );
}
