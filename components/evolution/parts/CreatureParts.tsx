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
}

const r2 = (v: number) => +v.toFixed(2);

function Body({ idPrefix, body }: PartCtx) {
  const grad = `${idPrefix}-bodyGrad`;
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CREATURE.main} />
          <stop offset="1" stopColor={CREATURE.mainDark} />
        </linearGradient>
      </defs>
      <path d={bodyPath(body)} fill={`url(#${grad})`} />
      <path
        d={`M ${r2(body.snoutX + 14)} ${body.centerY + 1} C ${r2(body.midX)} ${body.centerY - 2} ${r2(body.tailBaseX - 14)} ${body.centerY + 1} ${r2(body.tailBaseX)} ${body.centerY + 2}`}
        fill="none"
        stroke={CREATURE.outline}
        strokeOpacity={0.2}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function Tail({ idPrefix, body }: PartCtx) {
  const grad = `${idPrefix}-tailGrad`;
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={CREATURE.fin} />
          <stop offset="1" stopColor={CREATURE.mainDark} />
        </linearGradient>
      </defs>
      <path d={tailPath(body)} fill={`url(#${grad})`} />
    </g>
  );
}

function Eye({ anchors, body }: PartCtx) {
  const { x, y } = anchors.eyes;
  const r = Math.max(3.5, body.headDepth * 0.3);
  return (
    <g>
      <circle cx={x} cy={y} r={r2(r)} fill={CREATURE.eye} />
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
      strokeWidth={2}
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

function Armor({ body }: PartCtx) {
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
      <path d={path} fill={CREATURE.armor} />
      <path d={`${tick(s + headRun * 0.42)} ${tick(midX - 6)}`} fill="none" stroke={CREATURE.armorDark} strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function fin(fx: number, fy: number, scale: number) {
  const k = scale;
  return `M ${r2(fx - 5 * k)} ${r2(fy - 4 * k)} C ${r2(fx)} ${r2(fy + 10 * k)} ${r2(fx + 7 * k)} ${r2(fy + 18 * k)} ${r2(fx + 13 * k)} ${r2(fy + 20 * k)} C ${r2(fx + 11 * k)} ${r2(fy + 9 * k)} ${r2(fx + 5 * k)} ${r2(fy + 1 * k)} ${r2(fx)} ${r2(fy - 3 * k)} Z`;
}

function FinPectoral({ anchors }: PartCtx) {
  const { x, y } = anchors.flank;
  return <path d={fin(x, y, 1)} fill={CREATURE.fin} fillOpacity={0.92} />;
}

function FinPelvic({ anchors }: PartCtx) {
  const { x, y } = anchors.underside;
  return <path d={fin(x, y, 0.7)} fill={CREATURE.fin} fillOpacity={0.92} />;
}

function lobe(fx: number, fy: number) {
  return `M ${r2(fx - 5)} ${r2(fy - 5)} C ${r2(fx)} ${r2(fy + 14)} ${r2(fx + 9)} ${r2(fy + 24)} ${r2(fx + 18)} ${r2(fy + 28)} C ${r2(fx + 22)} ${r2(fy + 20)} ${r2(fx + 16)} ${r2(fy + 6)} ${r2(fx + 6)} ${r2(fy - 2)} Z`;
}

function LimbFore({ anchors }: PartCtx) {
  const { x, y } = anchors.flank;
  return (
    <g>
      <path d={lobe(x, y)} fill={CREATURE.fin} />
      <path d={`M ${r2(x + 16)} ${r2(y + 27)} l 6 2 M ${r2(x + 18)} ${r2(y + 24)} l 7 1 M ${r2(x + 19)} ${r2(y + 21)} l 6 0`} fill="none" stroke={CREATURE.outline} strokeOpacity={0.6} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

function LimbHind({ anchors }: PartCtx) {
  const { x, y } = anchors.underside;
  return (
    <g>
      <path d={lobe(x, y)} fill={CREATURE.fin} />
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
