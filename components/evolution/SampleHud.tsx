// Compact sample HUD. All values are illustrative demo data, clearly labelled —
// this preview is independent of any future simulation.

import { getEra } from "@/lib/evolution/eras/eras";
import type { EraId } from "@/lib/evolution/palette";
import { TraitIcon } from "./TraitIcon";

export interface SampleHudProps {
  era: EraId;
  /** Illustrative only. */
  population?: string;
  evoPoints?: number;
}

export function SampleHud({ era, population = "12,400", evoPoints = 38 }: SampleHudProps) {
  const e = getEra(era);
  return (
    <div className="evo-hud" aria-label="Sample HUD (demo data)">
      <span className="evo-hud__demo">demo data</span>
      <div className="evo-hud__stat">
        <TraitIcon name="population" size={18} title="Population" />
        <span className="evo-hud__value">{population}</span>
        <span className="evo-hud__key">population</span>
      </div>
      <div className="evo-hud__stat">
        <TraitIcon name="evo-points" size={18} title="Evolution points" />
        <span className="evo-hud__value">{evoPoints}</span>
        <span className="evo-hud__key">evo points</span>
      </div>
      <div className="evo-hud__period">
        <span className="evo-hud__era">{e.name}</span>
        <span className="evo-hud__ma">
          {e.baseMa}–{e.topMa} Ma
        </span>
      </div>
    </div>
  );
}
