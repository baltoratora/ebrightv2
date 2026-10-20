"use client";

// Controlled collapsible panel used for the secondary side panels. Default-open
// on desktop, default-collapsed on narrow screens (requirement: secondary panels
// collapsible, especially on mobile).

import { useState, type ReactNode } from "react";

export function Collapsible({
  title,
  children,
  defaultOpen,
  badge,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(
    defaultOpen ?? (typeof window !== "undefined" ? window.innerWidth >= 720 : true),
  );
  return (
    <section className={`evo-dock${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="evo-dock__header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="evo-dock__title">{title}</span>
        {badge ? <span className="evo-dock__badge">{badge}</span> : null}
        <span className="evo-dock__chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? <div className="evo-dock__body">{children}</div> : null}
    </section>
  );
}
