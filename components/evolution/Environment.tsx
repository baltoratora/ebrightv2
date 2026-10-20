// Layered SVG environment per period. Composition (back -> front):
//   distant water/atmosphere -> light -> seabed/shoreline -> habitat details
//   -> actor (creature, via children) -> foreground accents.
// Decorative layers are aria-hidden and pointer-events:none. An optional raster
// background can sit behind the SVG; the SVG reads as complete without it.

import type { ReactNode } from "react";
import { ERA_PALETTES, type EraId, type EraPalette } from "@/lib/evolution/palette";

export interface EnvironmentProps {
  era: EraId;
  children?: ReactNode; // the active creature, centred over the scene
  backgroundUrl?: string; // optional user-supplied raster layer
  className?: string;
}

const W = 400;
const H = 240;

export function Environment({ era, children, backgroundUrl, className }: EnvironmentProps) {
  const p = ERA_PALETTES[era];
  const gid = `evoScene-${era}`;
  return (
    <div className={`evo-scene${className ? ` ${className}` : ""}`}>
      {backgroundUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- optional raster layer; static export avoids the next/image loader
        <img className="evo-scene__bg" src={backgroundUrl} alt="" aria-hidden="true" />
      ) : null}
      <svg
        className="evo-scene__art"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${gid}-water`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={era === "devonian" ? (p.sky ?? p.waterTop) : p.waterTop} />
            <stop offset={era === "devonian" ? "0.32" : "0"} stopColor={p.waterTop} />
            <stop offset="1" stopColor={p.waterBottom} />
          </linearGradient>
        </defs>

        {/* distant water / atmosphere */}
        <rect x="0" y="0" width={W} height={H} fill={`url(#${gid}-water)`} />

        {/* light shafts */}
        <g className="evo-shafts" opacity={0.1}>
          <polygon points="60,0 120,0 90,240 40,240" fill={p.accent} />
          <polygon points="200,0 240,0 230,240 180,240" fill={p.accent} />
          <polygon points="320,0 350,0 360,240 300,240" fill={p.accent} />
        </g>

        <Habitat era={era} p={p} />

        {/* drifting particles */}
        <g className="evo-particles" fill={p.accent} opacity={0.5}>
          <circle className="evo-drift" cx="80" cy="70" r="2" />
          <circle className="evo-drift evo-drift--slow" cx="180" cy="120" r="1.6" />
          <circle className="evo-drift evo-drift--slow" cx="300" cy="90" r="2.2" />
          <circle className="evo-drift" cx="240" cy="50" r="1.4" />
          <circle className="evo-drift--slow" cx="130" cy="150" r="1.8" />
        </g>
      </svg>

      {children ? <div className="evo-scene__actor">{children}</div> : null}
    </div>
  );
}

function Habitat({ era, p }: { era: EraId; p: EraPalette }) {
  switch (era) {
    case "cambrian":
      return (
        <g>
          {/* muddy seabed */}
          <path d={`M0 200 C 90 186 180 206 260 196 C 320 188 370 200 ${W} 194 L ${W} ${H} L 0 ${H} Z`} fill={p.seabed} />
          <path d={`M0 214 C 120 206 260 220 ${W} 210 L ${W} ${H} L 0 ${H} Z`} fill={p.seabedDark} />
          {/* microbial mats */}
          <ellipse cx="110" cy="206" rx="46" ry="9" fill={p.habitatDark} opacity={0.5} />
          <ellipse cx="300" cy="202" rx="40" ry="8" fill={p.habitatDark} opacity={0.5} />
          {/* sponge / alga silhouettes */}
          <path className="evo-sway" d="M70 206 C 66 182 74 168 72 150 C 80 168 86 184 84 206 Z" fill={p.habitat} />
          <path className="evo-sway evo-sway--slow" d="M330 204 C 326 184 334 170 332 156 C 340 172 346 186 344 204 Z" fill={p.habitat} />
          <path className="evo-sway--slow" d="M250 206 C 248 190 254 180 253 170 C 260 182 263 192 262 206 Z" fill={p.habitatDark} />
        </g>
      );
    case "ordovician":
      return (
        <g>
          <path d={`M0 202 C 100 190 200 206 300 198 C 350 194 380 202 ${W} 198 L ${W} ${H} L 0 ${H} Z`} fill={p.seabed} />
          <path d={`M0 216 C 140 208 280 220 ${W} 212 L ${W} ${H} L 0 ${H} Z`} fill={p.seabedDark} />
          {/* reef mounds */}
          <path d="M60 204 C 70 176 118 176 128 204 Z" fill={p.habitat} />
          <path d="M120 206 C 134 184 168 184 180 206 Z" fill={p.habitatDark} />
          <path d="M292 204 C 304 180 344 180 356 204 Z" fill={p.habitat} />
          <ellipse cx="214" cy="206" rx="26" ry="7" fill={p.habitatDark} opacity={0.6} />
        </g>
      );
    case "silurian":
      return (
        <g>
          {/* far shore sliver near the surface with first small plants */}
          <rect x="300" y="26" width="100" height="12" fill={p.seabed} opacity={0.8} rx="4" />
          {[316, 332, 348, 364].map((x, i) => (
            <path key={i} className="evo-sway--slow" d={`M${x} 28 L ${x} 16 M ${x} 20 l 4 -3 M ${x} 20 l -4 -3`} stroke={p.plant ?? p.habitat} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          ))}
          {/* reef seabed */}
          <path d={`M0 204 C 110 192 210 208 300 200 C 350 196 380 204 ${W} 200 L ${W} ${H} L 0 ${H} Z`} fill={p.seabed} />
          <path d={`M0 218 C 150 210 280 222 ${W} 214 L ${W} ${H} L 0 ${H} Z`} fill={p.seabedDark} />
          <path d="M70 206 C 82 178 128 178 140 206 Z" fill={p.habitat} />
          <path d="M300 206 C 314 182 350 182 362 206 Z" fill={p.habitatDark} />
        </g>
      );
    case "devonian":
      return (
        <g>
          {/* muddy shoreline rising to the right */}
          <path d={`M0 212 C 120 206 220 200 300 176 C 340 164 370 150 ${W} 140 L ${W} ${H} L 0 ${H} Z`} fill={p.seabed} />
          <path d={`M0 222 C 140 216 250 214 ${W} 198 L ${W} ${H} L 0 ${H} Z`} fill={p.seabedDark} />
          {/* first-forest silhouettes at the land edge */}
          {[
            { x: 318, h: 46 },
            { x: 344, h: 60 },
            { x: 372, h: 52 },
          ].map((t, i) => (
            <g key={i} className="evo-sway--slow" fill={p.plant ?? p.habitatDark}>
              <rect x={t.x - 2} y={150 - t.h} width="4" height={t.h} rx="2" />
              <path d={`M${t.x} ${150 - t.h - 14} C ${t.x - 16} ${150 - t.h} ${t.x - 10} ${150 - t.h + 6} ${t.x} ${150 - t.h + 6} C ${t.x + 10} ${150 - t.h + 6} ${t.x + 16} ${150 - t.h} ${t.x} ${150 - t.h - 14} Z`} />
            </g>
          ))}
          {/* a small shallow-water plant */}
          <path className="evo-sway" d="M80 206 C 76 188 84 176 82 164 C 90 178 95 192 93 206 Z" fill={p.habitat} />
        </g>
      );
  }
}
