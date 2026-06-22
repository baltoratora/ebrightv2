// STEM topics the user can pick. Each maps to an active arXiv category and a
// seed phrase used to theme the AI-generated wallpaper.

export interface Topic {
  id: string;
  label: string;
  /** arXiv category, e.g. "cs.LG". */
  arxiv: string;
  /** Seed phrase for the wallpaper prompt. */
  wallpaperSeed: string;
}

export const TOPICS: Topic[] = [
  {
    id: "ai",
    label: "AI & Machine Learning",
    arxiv: "cs.LG",
    wallpaperSeed:
      "abstract neural network, glowing nodes and connections, deep blue and violet",
  },
  {
    id: "cv",
    label: "Computer Vision",
    arxiv: "cs.CV",
    wallpaperSeed:
      "abstract digital eye and pixel grids, teal and magenta, futuristic",
  },
  {
    id: "quantum",
    label: "Quantum Physics",
    arxiv: "quant-ph",
    wallpaperSeed:
      "quantum particles and wave interference, iridescent, dark cosmic background",
  },
  {
    id: "astro",
    label: "Astrophysics",
    arxiv: "astro-ph.GA",
    wallpaperSeed:
      "spiral galaxy and nebula, stars, deep space, vivid purples and gold",
  },
  {
    id: "math",
    label: "Mathematics",
    arxiv: "math.PR",
    wallpaperSeed:
      "elegant geometric fractal patterns, gold lines on dark, mathematical",
  },
  {
    id: "biology",
    label: "Quantitative Biology",
    arxiv: "q-bio.NC",
    wallpaperSeed:
      "abstract neurons and DNA helix, organic glowing greens and blues",
  },
];

export const DEFAULT_TOPIC = TOPICS[0];

export function topicById(id: string | null | undefined): Topic {
  return TOPICS.find((t) => t.id === id) ?? DEFAULT_TOPIC;
}
