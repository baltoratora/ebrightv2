"use client";

import { useEffect, useState } from "react";
import type { Fact } from "@/lib/fact";

export function FunFact() {
  const [fact, setFact] = useState<Fact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fact")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed");
        return body as Fact;
      })
      .then((f) => !cancelled && setFact(f))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fact">
      <span className="icon">💡</span>
      <div>
        <div className="label">Fun fact of the day</div>
        {fact ? (
          <div className="text">{fact.text}.</div>
        ) : error ? (
          <div className="text muted">Couldn&apos;t load today&apos;s fact.</div>
        ) : (
          <div className="shimmer" style={{ height: 22, width: "80%" }} />
        )}
      </div>
    </div>
  );
}
