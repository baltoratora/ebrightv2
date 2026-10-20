// Small reusable SVG icons in the lineage's visual language. All use
// `currentColor` so colour comes from CSS. When an icon labels a control, pass
// `title` (adds role="img" + <title>); otherwise it is decorative (aria-hidden).

import type { TraitId } from "@/lib/evolution/traits/traits";

export type IconName = TraitId | "population" | "evo-points";

const PATHS: Record<IconName, React.JSX.Element> = {
  armor: (
    <>
      <path d="M12 2 L20 5.5 V12 C20 17 12 22 12 22 C12 22 4 17 4 12 V5.5 Z" />
      <path d="M12 6 L15.5 7.5 V12 C15.5 14.6 12 17 12 17 C12 17 8.5 14.6 8.5 12 V7.5 Z" fill="var(--evo-panel, #0b0f14)" fillOpacity={0.25} />
    </>
  ),
  jaws: (
    <>
      <path d="M3 7 C 9 4.5 15 4.5 21 7.5 C 15 7.5 9 8.5 3 10 Z" />
      <path d="M3 17 C 9 19.5 15 19.5 21 16.5 C 15 16.5 9 15.5 3 14 Z" />
    </>
  ),
  "paired-fins": (
    <>
      <path d="M7 15 C 4 11 6 7 10 5 C 8.5 8.5 8.5 11.5 10 16 Z" />
      <path d="M17 15 C 20 11 18 7 14 5 C 15.5 8.5 15.5 11.5 14 16 Z" />
    </>
  ),
  "lobed-limbs": (
    <>
      <path d="M8 4 C 6.5 11 11 16.5 18 19 C 19 16 16.5 11 12 8 C 10.5 6.5 9 5 8 4 Z" />
      <path d="M17 18.5 l 3 1 M 18.5 16.5 l 3 0.4 M 19.5 14.5 l 2.6 -0.6" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" fill="none" />
    </>
  ),
  population: (
    <>
      <circle cx="8" cy="10" r="3.2" />
      <circle cx="15" cy="8" r="2.6" />
      <circle cx="13" cy="15" r="3" />
    </>
  ),
  "evo-points": (
    <>
      <rect x="11" y="10" width="2" height="11" rx="1" />
      <path d="M12 13 C 7.5 13 5 9.5 5 5.5 C 10 5.5 12 9 12 13 Z" />
      <path d="M12 13 C 16.5 13 19 9.5 19 5.5 C 14 5.5 12 9 12 13 Z" />
    </>
  ),
};

export interface TraitIconProps {
  name: IconName;
  size?: number;
  title?: string;
  className?: string;
}

export function TraitIcon({ name, size = 22, title, className }: TraitIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
