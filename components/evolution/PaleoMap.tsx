"use client";

// Central, interactive per-period paleogeographic map (spec §2). Renders the
// period's continents + a selectable node per available habitat, coloured by
// occupancy and sized by population. Original, illustrative — not a reconstruction.

import { PALEO_MAPS } from "@/lib/evolution/maps/paleo";
import { regionState } from "@/lib/evolution/sim/regions";
import { NORMAL } from "@/lib/evolution/sim/difficulty";
import type { RegionId, SimState } from "@/lib/evolution/sim/state";
import { ERA_PALETTES } from "@/lib/evolution/palette";

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
  const gid = `evoPaleo-${era}`;

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

        {map.continents.map((c) => (
          <g key={c.id} aria-hidden="true">
            <ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill={p.seabed} opacity={0.9} />
            <text x={c.cx} y={c.cy} className="evo-paleo__continent" textAnchor="middle" dominantBaseline="middle">
              {c.label}
            </text>
          </g>
        ))}

        {map.placements.map((pl) => {
          const rs = regionState(pl.region, era);
          const st = state.regions[pl.region];
          const occ = st.occ;
          const kBase = NORMAL.kBase[pl.region] || 1;
          const frac = Math.min(1, st.P / kBase);
          const radius = 3.2 + frac * 3.8;
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
              <circle cx={pl.cx} cy={pl.cy} r={radius} fill={fill} fillOpacity={locked ? 0.35 : 1} stroke={isSel ? p.accent : p.seabedDark} strokeWidth={isSel ? 1.4 : 0.6} />
              <text x={pl.cx} y={pl.cy - radius - 1.5} className="evo-node__label" textAnchor="middle">
                {LABELS[pl.region]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="evo-paleo__note">{map.label}</figcaption>
    </figure>
  );
}
