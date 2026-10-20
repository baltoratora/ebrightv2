// Parametric SVG part renderers. Each part is drawn from the active form's body
// config + derived attachment anchors, so parts track the silhouette as it
// changes per period. Gradient ids are namespaced with `idPrefix`.

import { CREATURE } from "@/lib/evolution/palette";
import type { PartId } from "@/lib/evolution/creatures/parts";
import {
  bodyPath,
  tailPath,
  headTip,
  type BodyConfig,
  type Anchors,
} from "@/lib/evolution/creatures/bodies";

export interface PartCtx {
  idPrefix: string;
  body: BodyConfig;
  anchors: Anchors;
  enhancedEyes?: boolean;
}

const r2 = (v: number) => +v.toFixed(2);

function Body({ idPrefix, body }: PartCtx) {
  const grad = `${idPrefix}-bodyGrad`;
  const clip = `${idPrefix}-skinClip`;
  const { snoutX: s, tailBaseX: tail, centerY: c, depth: d, midX } = body;
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aec0a0" />
          <stop offset="0.3" stopColor="#d4c59c" />
          <stop offset="0.65" stopColor="#b4ad81" />
          <stop offset="1" stopColor="#6f8063" />
        </linearGradient>
        <clipPath id={clip}><path d={bodyPath(body)} /></clipPath>
      </defs>
      <path d={bodyPath(body)} fill={`url(#${grad})`} stroke="#d0dec25c" strokeWidth={0.5} />
      <g clipPath={`url(#${clip})`} pointerEvents="none">
        {/* Subtle muscle segments and irregular pigment; original illustration. */}
        {Array.from({ length: 15 }, (_, i) => {
          const x = midX - 18 + i * (tail - midX + 12) / 16;
          return <path key={i} d={`M ${x} ${c - d} Q ${x + 8} ${c} ${x - 1} ${c + d}`} fill="none" stroke="#465f46" strokeOpacity={0.17} strokeWidth={0.6} />;
        })}
        {Array.from({ length: 36 }, (_, i) => <ellipse key={i} cx={s + 16 + ((i * 37) % Math.max(1, tail - s - 20))} cy={c - d * 0.6 + ((i * 13) % Math.max(1, d * 1.2))} rx={0.7 + i % 3 * 0.45} ry={0.5 + i % 2 * 0.3} fill="#365d45" opacity={0.14} />)}
        <path d={`M ${s + 5} ${c + 3} Q ${midX} ${c + d * .9} ${tail} ${c}`} stroke="#efe3b9" strokeOpacity={0.45} strokeWidth={0.8} fill="none" />
        {[0, 1, 2, 3].map(i => <path key={i} d={`M ${s + 25 + i * 4} ${c - body.headDepth * .65} Q ${s + 30 + i * 4} ${c} ${s + 25 + i * 4} ${c + body.headDepth * .6}`} stroke="#536d50" strokeOpacity={0.35} strokeWidth={0.7} fill="none" />)}
      </g>
      <path
        d={`M ${r2(body.snoutX + 14)} ${body.centerY + 1} C ${r2(body.midX)} ${body.centerY - 2} ${r2(body.tailBaseX - 14)} ${body.centerY + 1} ${r2(body.tailBaseX)} ${body.centerY + 2}`}
        fill="none"
        stroke="#667a56"
        strokeOpacity={0.25}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
    </g>
  );
}

function Tail({ idPrefix, body }: PartCtx) {
  const grad = `${idPrefix}-tailGrad`;
  const clip = `${idPrefix}-tailClip`;
  return (
    <g className="evo-living-tail">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a1b58f" stopOpacity={0.8} />
          <stop offset="1" stopColor="#98c2a6" stopOpacity={0.45} />
        </linearGradient>
        <clipPath id={clip}><path d={tailPath(body)} /></clipPath>
      </defs>
      <path d={tailPath(body)} fill={`url(#${grad})`} stroke="#c5d9b758" strokeWidth={0.55} />
      <g clipPath={`url(#${clip})`} stroke="#c2d4ac" strokeWidth={0.5} strokeOpacity={0.4}>
        {[-3, -2, -1, 0, 1, 2, 3].map(i => <path key={i} d={`M ${body.tailBaseX} ${body.centerY} Q ${body.tailBaseX + 25} ${body.centerY + i * 4} ${body.tailBaseX + 48} ${body.centerY + i * 8}`} fill="none" />)}
      </g>
    </g>
  );
}

function Eye({ anchors, body, enhancedEyes }: PartCtx) {
  const { x, y } = anchors.eyes;
  const r = Math.max(3.5, body.headDepth * 0.3) * (enhancedEyes ? 1.2 : 1);
  return (
    <g>
      <circle cx={x} cy={y} r={r2(r * 1.2)} fill="#d4d9b3" fillOpacity={0.8} />
      <circle cx={x} cy={y} r={r2(r)} fill="#16383b" />
      <circle cx={r2(x - r * 0.35)} cy={r2(y - r * 0.35)} r={r2(r * 0.3)} fill={CREATURE.eyeHighlight} />
    </g>
  );
}

function MouthSimple({ anchors }: PartCtx) {
  const { x, y } = anchors.mouth;
  return (
    <path
      d={`M ${r2(x - 4)} ${r2(y + 1)} C ${r2(x)} ${r2(y + 3)} ${r2(x + 6)} ${r2(y + 3)} ${r2(x + 10)} ${r2(y)}`}
      fill="none"
      stroke={CREATURE.accent}
      strokeOpacity={0.8}
      strokeWidth={0.8}
      strokeLinecap="round"
    />
  );
}

function Jaws({ body, anchors }: PartCtx) {
  const s = body.snoutX;
  const y = anchors.mouth.y;
  return (
    <g>
      <path d={`M ${r2(s - 2)} ${r2(y - 5)} L ${r2(s + 16)} ${r2(y)} L ${r2(s - 2)} ${r2(y + 5)} Z`} fill={CREATURE.accent} />
      <path d={`M ${r2(s - 2)} ${r2(y - 5)} L ${r2(s + 18)} ${r2(y - 2)}`} fill="none" stroke={CREATURE.outline} strokeWidth={2} strokeLinecap="round" />
      <path d={`M ${r2(s - 2)} ${r2(y + 5)} L ${r2(s + 16)} ${r2(y + 2)}`} fill="none" stroke={CREATURE.outline} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Armor({ body, idPrefix }: PartCtx) {
  const { snoutX: s, midX, centerY: c, depth: d, headDepth: hd } = body;
  const tip = headTip(body);
  const headRun = midX - s;
  const band = d * 0.78;
  const path = [
    `M ${r2(s)} ${r2(c - tip)}`,
    `C ${r2(s + headRun * 0.5)} ${r2(c - hd)} ${r2(midX - headRun * 0.5)} ${r2(c - d)} ${r2(midX)} ${r2(c - d)}`,
    `L ${r2(midX)} ${r2(c - d + band)}`,
    `C ${r2(midX - headRun * 0.5)} ${r2(c - hd + band)} ${r2(s + headRun * 0.5)} ${r2(c - hd + band)} ${r2(s)} ${r2(c - tip + band)} Z`,
  ].join(" ");
  const tick = (x: number) => `M ${r2(x)} ${r2(c - d + 2)} L ${r2(x)} ${r2(c - d + band - 2)}`;
  return (
    <g>
      <defs><linearGradient id={`${idPrefix}-plate`} x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor="#e4d9b4" /><stop offset="1" stopColor="#9c9f83" /></linearGradient></defs>
      <path d={path} fill={`url(#${idPrefix}-plate)`} stroke="#d9dbc27a" strokeWidth={0.5} />
      <path d={`${tick(s + headRun * 0.42)} ${tick(midX - 6)}`} fill="none" stroke="#656f59" strokeOpacity={0.5} strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );
}

function fin(fx: number, fy: number, scale: number) {
  const k = scale;
  return `M ${r2(fx - 5 * k)} ${r2(fy - 4 * k)} C ${r2(fx)} ${r2(fy + 10 * k)} ${r2(fx + 7 * k)} ${r2(fy + 18 * k)} ${r2(fx + 13 * k)} ${r2(fy + 20 * k)} C ${r2(fx + 11 * k)} ${r2(fy + 9 * k)} ${r2(fx + 5 * k)} ${r2(fy + 1 * k)} ${r2(fx)} ${r2(fy - 3 * k)} Z`;
}

function FinPectoral({ anchors }: PartCtx) {
  const { x, y } = anchors.flank;
  return <path d={fin(x, y, 1)} fill="#a8bb91" fillOpacity={0.75} stroke="#d6dcb76a" strokeWidth={0.6} />;
}

function FinPelvic({ anchors }: PartCtx) {
  const { x, y } = anchors.underside;
  return <path d={fin(x, y, 0.7)} fill="#a8bb91" fillOpacity={0.75} stroke="#d6dcb76a" strokeWidth={0.6} />;
}

function lobe(fx: number, fy: number) {
  return `M ${r2(fx - 5)} ${r2(fy - 5)} C ${r2(fx)} ${r2(fy + 14)} ${r2(fx + 9)} ${r2(fy + 24)} ${r2(fx + 18)} ${r2(fy + 28)} C ${r2(fx + 22)} ${r2(fy + 20)} ${r2(fx + 16)} ${r2(fy + 6)} ${r2(fx + 6)} ${r2(fy - 2)} Z`;
}

function LimbFore({ anchors }: PartCtx) {
  const { x, y } = anchors.flank;
  return (
    <g>
      <path d={lobe(x, y)} fill="#a8b38b" stroke="#d9ddbe66" strokeWidth={0.5} />
      <path d={`M ${r2(x + 16)} ${r2(y + 27)} l 6 2 M ${r2(x + 18)} ${r2(y + 24)} l 7 1 M ${r2(x + 19)} ${r2(y + 21)} l 6 0`} fill="none" stroke={CREATURE.outline} strokeOpacity={0.6} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

function LimbHind({ anchors }: PartCtx) {
  const { x, y } = anchors.underside;
  return (
    <g>
      <path d={lobe(x, y)} fill="#a8b38b" stroke="#d9ddbe66" strokeWidth={0.5} />
      <path d={`M ${r2(x + 16)} ${r2(y + 27)} l 6 1 M ${r2(x + 18)} ${r2(y + 24)} l 6 0`} fill="none" stroke={CREATURE.outline} strokeOpacity={0.6} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

export const PART_COMPONENTS: Record<PartId, (ctx: PartCtx) => React.JSX.Element> = {
  body: Body,
  eye: Eye,
  tail: Tail,
  "mouth-simple": MouthSimple,
  jaws: Jaws,
  armor: Armor,
  "fin-pectoral": FinPectoral,
  "fin-pelvic": FinPelvic,
  "limb-fore": LimbFore,
  "limb-hind": LimbHind,
};
