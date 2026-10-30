"use client";

import { GameGlyph } from "@/components/GameGlyph";

import Link from "next/link";
import { useState } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { GAMES, type GameGroup } from "@/lib/games";

const MotionLink = m.create(Link);

const GROUPS: (GameGroup | "All")[] = ["All", "Puzzles", "Words", "Cards", "Strategy", "Arcade", "Adventure"];

export function GameLibrary() {
  const [group, setGroup] = useState<GameGroup | "All">("All");
  const [search, setSearch] = useState("");
  const games = GAMES.filter((g) => (group === "All" || g.group === group) &&
    `${g.name} ${g.desc}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation} strict>
      <div className="library-tools">
        <label className="library-search"><span aria-hidden="true">⌕</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find your next game" aria-label="Search games" />
        </label>
        <div className="library-filters" role="group" aria-label="Game categories">
          {GROUPS.map((g) => <button key={g} aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>)}
        </div>
      </div>
      <p className="library-count" role="status">{games.length} games · pick up and play</p>
      <div className="games library-grid">
        {games.map((g) => <MotionLink className="game-card" key={g.href} href={g.href}
          initial={false} animate={{ opacity: 1 }}
          whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}
          transition={{ duration: 0.18, ease: "easeOut" }}>
          <span className="game-card-top"><span className="game-icon" aria-hidden="true"><GameGlyph href={g.href} /></span><span className="game-group">{g.group}</span></span>
          <span className="game-name">{g.name}</span><span className="game-desc">{g.desc}</span>
          <span className="game-card-play">Play <span aria-hidden="true">↗</span></span>
        </MotionLink>)}
      </div>
      {games.length === 0 && <p className="library-empty">No matches. Try another name or category.</p>}
    </LazyMotion>
    </MotionConfig>
  );
}
