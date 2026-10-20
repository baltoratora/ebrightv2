"use client";

// Accessible, collapsed-by-default disclosure for sourced science detail, so the
// main game stays readable and immersive (spec §10 / requirement: expandable
// science notes).

import type { ReactNode } from "react";

export function ScienceNote({ children, summary = "Science note" }: { children: ReactNode; summary?: string }) {
  return (
    <details className="evo-science">
      <summary className="evo-science__summary">{summary}</summary>
      <div className="evo-science__body">{children}</div>
    </details>
  );
}
