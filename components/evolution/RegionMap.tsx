"use client";

// Region-map study: original, simplified geography (NOT a copied paleogeographic
// reconstruction). Land/shelf regions are selectable and keyboard-operable;
// the open ocean is decorative. Colours follow the active era palette.

import { REGION_MAP } from "@/lib/evolution/eras/eras";
import { ERA_PALETTES, type EraId } from "@/lib/evolution/palette";

export interface RegionMapProps {
  era: EraId;
  selected?: string | null;
  onSelect?: (id: string) => void;
}

export function RegionMap({ era, selected, onSelect }: RegionMapProps) {
  const p = ERA_PALETTES[era];
  const gid = `evoMap-${era}`;
  return (
    <figure className="evo-map">
      <svg viewBox="0 0 100 100" className="evo-map__svg" role="group" aria-label="Region map study (illustrative)">
        <defs>
          <radialGradient id={`${gid}-ocean`} cx="0.5" cy="0.45" r="0.7">
            <stop offset="0" stopColor={p.waterTop} />
            <stop offset="1" stopColor={p.waterBottom} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${gid}-ocean)`} />

        {REGION_MAP.regions.map((r) => {
          if (!r.selectable) {
            return r.type === "ocean" ? null : (
              <ellipse key={r.id} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={p.seabed} aria-hidden="true" />
            );
          }
          const fill = r.type === "land" ? p.seabed : p.habitat;
          const isSel = selected === r.id;
          return (
            <g
              key={r.id}
              className={`evo-region${isSel ? " is-selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={`${r.label} (${r.type})`}
              onClick={() => onSelect?.(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(r.id);
                }
              }}
            >
              <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={fill} />
              <ellipse
                cx={r.cx}
                cy={r.cy}
                rx={r.rx}
                ry={r.ry}
                fill="none"
                stroke={isSel ? p.accent : p.seabedDark}
                strokeWidth={isSel ? 2 : 0.8}
              />
              <text x={r.cx} y={r.cy} className="evo-region__label" textAnchor="middle" dominantBaseline="middle">
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="evo-map__note">{REGION_MAP.note}</figcaption>
    </figure>
  );
}
