// SVG part renderers for the lineage, authored in the shared viewBox space
// (260 x 160), facing left. Each part is a presentational fragment keyed by
// PartId; the Creature component decides which to render and in what order via
// renderDescriptor(). Gradient/clip ids are namespaced with `idPrefix` so many
// creatures can share a page without id collisions.

import { CREATURE } from "@/lib/evolution/palette";
import type { PartId } from "@/lib/evolution/creatures/parts";

export interface PartProps {
  idPrefix: string;
}

function Body({ idPrefix }: PartProps) {
  const grad = `${idPrefix}-bodyGrad`;
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CREATURE.main} />
          <stop offset="1" stopColor={CREATURE.mainDark} />
        </linearGradient>
      </defs>
      <path
        d="M 48 82 C 54 60 92 54 132 56 C 172 58 198 70 206 82 C 198 94 172 104 132 106 C 92 108 54 102 48 82 Z"
        fill={`url(#${grad})`}
      />
      <path
        d="M 70 82 C 110 78 160 80 198 84"
        fill="none"
        stroke={CREATURE.outline}
        strokeOpacity={0.22}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  );
}

function Eye() {
  return (
    <g>
      <circle cx={58} cy={66} r={6} fill={CREATURE.eye} />
      <circle cx={55.6} cy={63.8} r={1.8} fill={CREATURE.eyeHighlight} />
    </g>
  );
}

function Tail({ idPrefix }: PartProps) {
  const grad = `${idPrefix}-tailGrad`;
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={CREATURE.fin} />
          <stop offset="1" stopColor={CREATURE.mainDark} />
        </linearGradient>
      </defs>
      <path
        d="M 204 80 C 222 66 236 60 246 62 C 240 72 240 88 246 98 C 236 100 222 94 204 80 Z"
        fill={`url(#${grad})`}
      />
    </g>
  );
}

function MouthSimple() {
  return (
    <path
      d="M 40 86 C 44 88 50 88 54 85"
      fill="none"
      stroke={CREATURE.accent}
      strokeOpacity={0.8}
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

function Jaws() {
  return (
    <g>
      <path d="M 38 80 L 56 85 L 38 92 Z" fill={CREATURE.accent} />
      <path d="M 38 80 L 58 82" fill="none" stroke={CREATURE.outline} strokeWidth={2} strokeLinecap="round" />
      <path d="M 38 92 L 56 89" fill="none" stroke={CREATURE.outline} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Armor() {
  return (
    <g>
      <path
        d="M 50 80 C 52 60 84 55 100 62 C 98 74 96 82 92 88 C 74 92 56 90 50 80 Z"
        fill={CREATURE.armor}
      />
      <path
        d="M 100 62 C 116 58 130 60 138 66 C 136 80 132 88 128 92 C 114 90 104 85 98 82 C 100 74 100 68 100 62 Z"
        fill={CREATURE.armorDark}
      />
      <path
        d="M 56 74 C 70 70 86 72 94 76"
        fill="none"
        stroke={CREATURE.armorDark}
        strokeOpacity={0.5}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <path
        d="M 108 69 C 118 67 128 69 134 73"
        fill="none"
        stroke={CREATURE.eyeHighlight}
        strokeOpacity={0.3}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function FinPectoral() {
  return (
    <path
      d="M 110 96 C 116 110 124 118 132 120 C 130 110 126 102 120 97 Z"
      fill={CREATURE.fin}
      fillOpacity={0.92}
    />
  );
}

function FinPelvic() {
  return (
    <path
      d="M 148 98 C 154 108 160 112 166 112 C 164 105 160 101 156 99 Z"
      fill={CREATURE.fin}
      fillOpacity={0.92}
    />
  );
}

function LimbFore() {
  return (
    <g>
      <path
        d="M 108 96 C 114 112 124 122 136 126 C 140 118 136 106 126 98 Z"
        fill={CREATURE.fin}
      />
      <path d="M 134 126 l 6 2 M 136 123 l 7 1 M 138 120 l 6 0" fill="none" stroke={CREATURE.outline} strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function LimbHind() {
  return (
    <g>
      <path
        d="M 150 98 C 156 114 166 122 178 124 C 180 116 174 104 162 98 Z"
        fill={CREATURE.fin}
      />
      <path d="M 176 124 l 6 1 M 178 121 l 6 0" fill="none" stroke={CREATURE.outline} strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

export const PART_COMPONENTS: Record<PartId, (props: PartProps) => React.JSX.Element> = {
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
