"use client";

import { useEffect, useRef } from "react";
import type { Period, RegionId, SimState } from "@/lib/evolution/sim/state";
import { availableRegions } from "@/lib/evolution/sim/regions";
import { HABITAT_COPY, HABITAT_NAMES, habitatView, dispersalCorridors } from "@/lib/evolution/presentation";
import type { TraitId } from "@/lib/evolution/traits/traits";
import { Creature } from "../Creature";
import { paintSea, type SeaFrame } from "./seaPainter";
import styles from "./Immersion.module.css";

export function SeaBackdrop({ period = "cambrian", region = "nursery", density = .25,
  populated = true, stressed = false, paused = false, speed = 1, swimming = false,
}: Partial<SeaFrame> & { paused?: boolean; speed?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef({ period, region, density, populated, stressed, paused, speed, swimming });
  const repaint = useRef<(() => void) | null>(null);
  useEffect(() => {
    input.current = { period, region, density, populated, stressed, paused, speed, swimming };
    repaint.current?.();
  }, [period, region, density, populated, stressed, paused, speed, swimming]);

  useEffect(() => {
    const element = canvas.current;
    const c = element?.getContext("2d");
    if (!element || !c) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, time = 0, last = 0, frame = 0, lastPaint = 0;
    const draw = () => paintSea(c, width, height, { ...input.current, time: motion.matches ? 0 : time });
    repaint.current = draw;
    const resize = () => {
      const rect = element.getBoundingClientRect(); width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * dpr); element.height = Math.round(height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    };
    const loop = (now: number) => {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!input.current.paused && !document.hidden && !motion.matches) {
        time += dt * input.current.speed;
        // Decorative rendering at 30fps; this never ticks the game simulation.
        if (now - lastPaint > 32) { draw(); lastPaint = now; }
      }
      if (!motion.matches) frame = requestAnimationFrame(loop);
    };
    const motionChanged = () => { cancelAnimationFrame(frame); last = 0; draw(); if (!motion.matches) frame = requestAnimationFrame(loop); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    motion.addEventListener("change", motionChanged);
    if (!motion.matches) frame = requestAnimationFrame(loop);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); motion.removeEventListener("change", motionChanged); repaint.current = null; };
  }, []);
  return <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />;
}

const ART_TRAITS: TraitId[] = ["armor", "jaws", "paired-fins", "lobed-limbs"];
const CHAPTER: Record<Period, { title: string; subtitle: string }> = {
  cambrian: { title: "A small beginning.", subtitle: "A world of possibility." },
  ordovician: { title: "Life finds a foothold.", subtitle: "The seas are changing." },
  silurian: { title: "New waters. New chances.", subtitle: "A lineage finding its way." },
  devonian: { title: "At the water’s edge.", subtitle: "One possible path forward." },
};

export function LivingScene({ state, selected, speed, onSelect }: {
  state: SimState; selected: RegionId; speed: number; onSelect: (id: RegionId) => void;
}) {
  const view = habitatView(state, selected);
  const traits = state.traits.filter((id): id is TraitId => ART_TRAITS.includes(id as TraitId));
  const corridors = dispersalCorridors(state).filter((e) => e.from === selected);
  const chapter = CHAPTER[state.clock.period];
  const stopped = state.paused || state.status !== "running";
  const available = availableRegions(state.clock.period);
  return (
    <section className={styles.scene} data-paused={stopped} aria-label={`${HABITAT_NAMES[selected]} habitat illustration`}>
      <SeaBackdrop period={state.clock.period} region={selected} density={view.density} populated={view.population > 0}
        stressed={view.stressed} paused={stopped} speed={speed} swimming={state.traits.includes("swimming")} />
      <div className={styles.sceneShade} />
      <div className={styles.chapter}>
        <span className={styles.eyebrow}>{state.clock.period} · {HABITAT_NAMES[selected]}</span>
        <h1>{chapter.title}<br /><em>{chapter.subtitle}</em></h1>
        <p>{HABITAT_COPY[selected]}</p>
      </div>
      <div className={styles.fieldNote}><span>{stopped ? "WORLD PAUSED" : "LIVING HABITAT"}</span><strong>{Math.round(view.population)}</strong><small>population units here</small></div>
      <div className={styles.heroAnimal}>
        <Creature key={`${state.clock.period}-${state.traits.join("-")}`} form={state.clock.period} traits={traits} enhancedEyes={state.traits.includes("eyes")} className={styles.animal} label={`Your fictional ${state.clock.period} lineage specimen`} />
        <span className={styles.specimenLabel}><small>YOUR LINEAGE · SPECIMEN VIEW</small>{state.niche === "benthicGrazing" ? "Seabed forager" : "Suspension feeder"}</span>
      </div>
      <div className={styles.sceneBottom}>
        <p className={styles.migrationLabel}>{view.stressed ? "Habitat under pressure. Inspect the limiting factor below." : corridors.length ? `Dispersal corridors: ${corridors.map((c) => HABITAT_NAMES[c.to]).join(" · ")}` : "No suitable outward corridor at this moment."}</p>
        <div className={styles.habitats} role="group" aria-label="Inspect a habitat">
          {available.map(id => <button type="button" key={id} onClick={() => onSelect(id)} aria-pressed={id === selected}>
            <span>{HABITAT_NAMES[id]}</span><b>{Math.floor(state.regions[id].P)}</b><small>{state.regions[id].occ === "occupied" ? "Established" : state.regions[id].P > 0 ? "Colonising" : "Unsettled"}</small>
          </button>)}
        </div>
      </div>
    </section>
  );
}
