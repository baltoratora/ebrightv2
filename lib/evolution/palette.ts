// Scoped natural-history palette for the Evolve art system.
// Deliberately separate from the site's deep-space neon tokens: low-saturation,
// coordinated, no neon. Values are plain hex/rgba so they can be used both in TS
// (SVG fills) and emitted as CSS custom properties on the game root.

export type EraId = "cambrian" | "ordovician" | "silurian" | "devonian";

/** UI neutrals for HUD/controls over the scene. */
export const UI = {
  ink: "#1c2230", // soft near-black for text/strokes
  parchment: "#f3ede0", // light scientific-plate surface
  panel: "rgba(16, 26, 32, 0.72)", // translucent HUD panel over the scene
  panelInk: "#eaf1f2", // text on panel
  accent: "#e8a24a", // warm ochre — primary control accent
  accent2: "#3f8f86", // muted teal — secondary
  focus: "#ffd27a", // focus ring
} as const;

/**
 * Shared lineage palette. Kept consistent across all four forms so they read as
 * kin (the environment sub-palettes carry the per-era colour change, not the
 * creature). One subtle 2-stop gradient (main -> mainDark) gives volume.
 */
export const CREATURE = {
  main: "#c98a5e", // warm sandy body
  mainDark: "#a66c45", // gradient shadow side
  armor: "#8a99aa", // bony plate (slate)
  armorDark: "#6d7e8e",
  fin: "#d7a97e", // fins/limbs, slightly lighter than body
  finTranslucent: "rgba(215, 169, 126, 0.6)",
  eye: "#2a2f3a",
  eyeHighlight: "#f3ede0",
  accent: "#b5533f", // mouth/jaw interior, gill hints
  outline: "#5e4631", // sparingly used soft outline
} as const;

export interface EraPalette {
  waterTop: string; // distant atmosphere / upper water
  waterBottom: string; // deeper water near seabed
  seabed: string; // seabed / shoreline ground
  seabedDark: string;
  habitat: string; // reef / plant / mat habitat colour
  habitatDark: string;
  accent: string; // sunlight shafts / highlights / foreground accents
  sky?: string; // warm sky band (Devonian shoreline)
  plant?: string; // early land plants (Silurian far shore, Devonian edge)
}

// Four era sub-palettes. Sources for the science are in eras.ts; these are
// artistic colours chosen to be distinct yet coherent (shared saturation/value).
export const ERA_PALETTES: Record<EraId, EraPalette> = {
  // Cambrian: deep, cool, mysterious seas.
  cambrian: {
    waterTop: "#15565c",
    waterBottom: "#0d3b44",
    seabed: "#7a5a3a",
    seabedDark: "#5e4631",
    habitat: "#b06b53",
    habitatDark: "#834d3c",
    accent: "#9fd6cf",
  },
  // Ordovician: brighter shallow sea, diversifying life.
  ordovician: {
    waterTop: "#3fa0a0",
    waterBottom: "#1f6f7a",
    seabed: "#c9a86a",
    seabedDark: "#9c8049",
    habitat: "#9a6b84",
    habitatDark: "#6f4c61",
    accent: "#e9c27a",
  },
  // Silurian: clear reef seas, first small plants on the far shore.
  silurian: {
    waterTop: "#5bbf9e",
    waterBottom: "#2a8f84",
    seabed: "#b8a26a",
    seabedDark: "#8c7a47",
    habitat: "#7fae6a",
    habitatDark: "#5a8349",
    accent: "#f0cf7e",
    plant: "#6fae55",
  },
  // Devonian: warm shallow water meeting a muddy shoreline with early forests.
  devonian: {
    waterTop: "#6fae7e",
    waterBottom: "#2f7d5e",
    seabed: "#8a6b43",
    seabedDark: "#654d30",
    habitat: "#6c9a4a",
    habitatDark: "#4f7a3a",
    accent: "#e9c98a",
    sky: "#e9c98a",
    plant: "#4f7a3a",
  },
};

/** Flatten tokens into CSS custom properties for the game root element. */
export function evoCssVars(): Record<string, string> {
  const vars: Record<string, string> = {
    "--evo-ink": UI.ink,
    "--evo-parchment": UI.parchment,
    "--evo-panel": UI.panel,
    "--evo-panel-ink": UI.panelInk,
    "--evo-accent": UI.accent,
    "--evo-accent-2": UI.accent2,
    "--evo-focus": UI.focus,
  };
  return vars;
}
