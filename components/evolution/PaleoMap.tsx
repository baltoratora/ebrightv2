"use client";

// Central, interactive per-period paleogeographic map (spec §2). Renders the
// period's continents + a selectable node per available habitat, coloured by
// occupancy and sized by population. Original, illustrative — not a reconstruction.

import { useId } from "react";
import { PALEO_MAPS, type Continent } from "@/lib/evolution/maps/paleo";
import { regionState, edgesFor, effectiveGate } from "@/lib/evolution/sim/regions";
import { NORMAL } from "@/lib/evolution/sim/difficulty";
import type { RegionId, SimState } from "@/lib/evolution/sim/state";
import { ERA_PALETTES } from "@/lib/evolution/palette";
import styles from "./immersion/Immersion.module.css";

// Original stylised coastlines within the existing map's geographic envelopes.
// These retain the project's approximate placement, not a new reconstruction.
function coastline(c: Continent, index: number) {
  return Array.from({ length: 28 }, (_, i) => {
    const a = i * Math.PI * 2 / 28;
    const r = .88 + Math.sin(i * 2.4 + index) * .07 + Math.cos(i * 1.3) * .05;
    return `${i === 0 ? "M" : "L"}${(c.cx + Math.cos(a) * c.rx * r).toFixed(2)},${(c.cy + Math.sin(a) * c.ry * r).toFixed(2)}`;
  }).join(" ") + " Z";
}

const LABELS: Record<RegionId, string> = {
  nursery: "Nursery Shallows",
  reef: "Reef Shelf",
  openOcean: "Open Ocean",
  deepAnoxic: "Deep Anoxic",
  estuary: "Estuary",
  river: "River Lowlands",
  tidalFlats: "Tidal Flats",
  land: "Land",
};

export function PaleoMap({
  state,
  selected,
  onSelect,
}: {
  state: SimState;
  selected: RegionId | null;
  onSelect: (id: RegionId) => void;
}) {
  const era = state.clock.period;
  const map = PALEO_MAPS[era];
  const p = ERA_PALETTES[era];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gid = `evoPaleo-${era}-${uid}`;

  return (
    <figure className="evo-paleo">
      <svg viewBox="0 0 100 100" className="evo-paleo__svg" role="group" aria-label={`Paleogeographic map — ${era}`}>
        <defs>
          <radialGradient id={`${gid}-ocean`} cx="0.5" cy="0.4" r="0.75">
            <stop offset="0" stopColor={p.waterTop} />
            <stop offset="1" stopColor={p.waterBottom} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${gid}-ocean)`} />

        <g aria-hidden="true" stroke="#adc8ba" strokeOpacity={0.07} strokeWidth={0.2}>
          {[20, 40, 60, 80].map(n => <path key={n} d={`M 0 ${n} H 100 M ${n} 0 V 100`} />)}
        </g>
        {map.continents.map((c, i) => (
          <g key={c.id} aria-hidden="true">
            <path d={coastline(c, i)} fill="#a9ba8b0d" stroke="#b6d3b1" strokeOpacity={0.16} strokeWidth={2.4} />
            <path d={coastline(c, i)} fill="#576f57" stroke="#bac9a888" strokeWidth={0.35} />
            <text x={c.cx} y={c.cy} className="evo-paleo__continent" textAnchor="middle" dominantBaseline="middle">
              {c.label.split(" (")[0]}
            </text>
          </g>
        ))}
        <g aria-hidden="true">
          {edgesFor(era).map(e => {
            const a = map.placements.find(p => p.region === e.a), b = map.placements.find(p => p.region === e.b);
            if (!a || !b) return null;
            const closed = effectiveGate(e, state.traits) === "hard";
            return <path key={`${e.a}-${e.b}`} d={`M ${a.cx} ${a.cy} Q ${(a.cx + b.cx) / 2 + 5} ${(a.cy + b.cy) / 2 - 6} ${b.cx} ${b.cy}`} stroke={closed ? "#7d958c" : "#ccdbaf"} strokeOpacity={closed ? .2 : .5} strokeWidth={.35} strokeDasharray={closed ? "1 2" : "1 1"} fill="none" />;
          })}
        </g>
        {map.placements.map((pl, index) => {
          const rs = regionState(pl.region, era);
          const st = state.regions[pl.region];
          const occ = st.occ;
          const kBase = NORMAL.kBase[pl.region] || 1;
          const frac = Math.min(1, st.P / kBase);
          const radius = 2.8 + frac * 1.4;
          const isSel = selected === pl.region;
          const fill = occ === "occupied" ? p.accent : occ === "colonizing" ? p.habitat : p.seabedDark;
          const locked = !rs.available;
          return (
            <g
              key={pl.region}
              className={`evo-node${isSel ? " is-selected" : ""}${locked ? " is-locked" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={`${LABELS[pl.region]} — ${locked ? "inaccessible" : occ}, population ${Math.round(st.P)}`}
              onClick={() => onSelect(pl.region)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(pl.region);
                }
              }}
            >
              <circle cx={pl.cx} cy={pl.cy} r={radius + 1.5} fill="transparent" stroke={isSel ? "#e8d3a4" : "transparent"} strokeWidth={0.4} />
              <circle cx={pl.cx} cy={pl.cy} r={radius} fill={occ === "occupied" ? "#bcd0a5" : fill} fillOpacity={locked ? 0.35 : 1} stroke="#c8d6b988" strokeWidth={0.4} />
              <text x={pl.cx} y={pl.cy + 1} className="evo-node__label" textAnchor="middle">
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={styles.mapLegend} role="group" aria-label="Map regions">
        {map.placements.map((pl, i) => <button key={pl.region} type="button" aria-pressed={selected === pl.region} onClick={() => onSelect(pl.region)}><span>{i + 1}</span>{LABELS[pl.region]}<small>{Math.floor(state.regions[pl.region].P)}</small></button>)}
      </div>
      <figcaption className="evo-paleo__note">{map.label}</figcaption>
    </figure>
  );
}
