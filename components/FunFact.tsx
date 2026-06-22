"use client";

import { useCallback, useEffect, useState } from "react";
import type { Fact } from "@/lib/fact";

export function FunFact() {
  const [fact, setFact] = useState<Fact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // random=false -> today's fact (initial); random=true -> a fresh one (refresh).
  const load = useCallback(async (random: boolean) => {
    if (random) setRefreshing(true);
    try {
      const res = await fetch(`/api/fact${random ? "?random=1" : ""}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      setFact(body as Fact);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return (
    <div className="fact">
      <span className="icon">💡</span>
      <div className="fact-body">
        <div className="label">Fun fact of the day</div>
        {fact ? (
          <div className="text">{fact.text}</div>
        ) : error ? (
          <div className="text muted">Couldn&apos;t load a fact.</div>
        ) : (
          <div className="shimmer" style={{ height: 22, width: "80%" }} />
        )}
      </div>
      <button
        className="fact-refresh"
        onClick={() => load(true)}
        disabled={refreshing}
        aria-label="Show another fact"
        title="Show another fact"
      >
        <span className={refreshing ? "spinning" : ""}>↻</span>
      </button>
    </div>
  );
}
