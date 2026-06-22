"use client";

import { TOPICS } from "@/lib/topics";

export function TopicSelector({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="topics" role="tablist" aria-label="STEM topics">
      {TOPICS.map((t) => (
        <button
          key={t.id}
          className={`chip${t.id === active ? " active" : ""}`}
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
