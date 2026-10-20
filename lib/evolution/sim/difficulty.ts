// Difficulty parameter table. Every balance-sensitive constant lives here so
// Relaxed/Hard become data-only presets later (spec §8.6). Values start from
// spec §14 and are tuned by the headless scenarios (M3 / plan Task 20).

import type { Period, RegionId } from "./state";

export interface ShockSpec {
  capacity: { regions: RegionId[]; factor: number };   // multiplies region K (gradual decline)
  loss: { regions: RegionId[]; fraction: number };     // explicit one-time population loss
  penalty: { regions: RegionId[]; amount: number; mitigatedBy: string }; // ongoing fitness penalty
}

export interface DifficultyParams {
  SIM_DT: number;
  eraBudgetSec: Record<Period, number>;
  kBase: Record<RegionId, number>;
  rMax: number;
  mBase: number;
  mStress: number;
  mCrowd: number;
  extinctionFloorRegion: number;
  extinctionFloorGlobal: number;
  establishHighFrac: number;
  establishLowFrac: number;
  migrationRate: number;
  conductance: { open: number; soft: number; hard: number };
  kPop: number;
  kDiv: number;
  eventSurvivalGrant: number;
  catchUpFloor: number;
  declineEP: number;
  traitCost: Record<string, number>;
  mutationIntervalSec: number;
  dominateTargets: Record<Period, number>;
  recoverySec: number;
  shocks: Record<string, ShockSpec>;
}

export const NORMAL: DifficultyParams = {
  SIM_DT: 0.25,
  eraBudgetSec: { cambrian: 300, ordovician: 480, silurian: 420, devonian: 600 },
  kBase: {
    nursery: 100, reef: 150, openOcean: 120, deepAnoxic: 80,
    estuary: 90, river: 70, tidalFlats: 60, land: 0,
  },
  rMax: 0.05,
  mBase: 0.005,
  mStress: 0.04,
  mCrowd: 0.03,
  extinctionFloorRegion: 0.01, // only clears negligible remnants; must stay below
  extinctionFloorGlobal: 1,    // seeding amounts so migration can colonise regions

  establishHighFrac: 0.25,
  establishLowFrac: 0.15,
  migrationRate: 0.1,
  conductance: { open: 1.0, soft: 0.2, hard: 0 },
  kPop: 0.2,
  kDiv: 0.5,
  eventSurvivalGrant: 15,
  catchUpFloor: 0.5,
  declineEP: 5,
  traitCost: {
    eyes: 10, swimming: 10,
    repR: 25, repK: 25, thermal: 30, armor: 30, osmoregulation: 35, hypoxia: 35,
    jaws: 40, "paired-fins": 40, airGulping: 40, "lobed-limbs": 50,
  },
  mutationIntervalSec: 90,
  dominateTargets: { cambrian: 2, ordovician: 2, silurian: 3, devonian: 4 },
  recoverySec: 90,
  shocks: {
    hirnantian: {
      capacity: { regions: ["nursery", "reef"], factor: 0.4 },
      loss: { regions: ["nursery", "reef"], fraction: 0.2 },
      penalty: { regions: ["nursery", "reef", "openOcean", "estuary"], amount: 0.3, mitigatedBy: "thermal" },
    },
    kellwasser: {
      capacity: { regions: ["reef"], factor: 0.3 },
      loss: { regions: ["reef", "nursery"], fraction: 0.3 },
      penalty: { regions: ["nursery", "reef", "estuary", "tidalFlats", "openOcean"], amount: 0.5, mitigatedBy: "hypoxia" },
    },
    hangenberg: {
      capacity: { regions: ["reef"], factor: 0.0 },
      loss: { regions: ["reef", "nursery", "estuary", "openOcean"], fraction: 0.6 },
      penalty: { regions: ["nursery", "reef", "estuary", "tidalFlats", "openOcean"], amount: 0.6, mitigatedBy: "hypoxia" },
    },
  },
};
