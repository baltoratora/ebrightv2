"use client";

import { useEffect, useState } from "react";
import type { Paper } from "@/lib/arxiv";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function authorLine(authors: string[]): string {
  if (authors.length === 0) return "Unknown authors";
  if (authors.length <= 3) return authors.join(", ");
  return `${authors.slice(0, 3).join(", ")} +${authors.length - 3} more`;
}

export function PaperOfDay({ topic }: { topic: string }) {
  const [paper, setPaper] = useState<Paper | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/paper?topic=${encodeURIComponent(topic)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed");
        return body.paper as Paper;
      })
      .then((p) => {
        if (!cancelled) {
          setPaper(p);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [topic]);

  return (
    <div className="panel">
      <h2>📄 Paper of the day</h2>
      {loading ? (
        <>
          <div className="shimmer" style={{ height: 24, width: "90%", marginBottom: 10 }} />
          <div className="shimmer" style={{ height: 14, width: "50%", marginBottom: 14 }} />
          <div className="shimmer" style={{ height: 60, width: "100%" }} />
        </>
      ) : error ? (
        <div className="muted">Couldn&apos;t load a paper for this topic right now.</div>
      ) : paper ? (
        <>
          <p className="paper-title">{paper.title}</p>
          <div className="paper-meta">
            {authorLine(paper.authors)}
            {paper.published ? ` · ${formatDate(paper.published)}` : ""}
          </div>
          <p className="paper-abstract">{paper.summary}</p>
          <a className="link" href={paper.url} target="_blank" rel="noopener noreferrer">
            Read on arXiv →
          </a>
        </>
      ) : null}
    </div>
  );
}
