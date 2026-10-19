// Pure engine for the Guess game. No React, no DOM, no localStorage.

export type Direction = "up" | "down" | "hit"; // up = answer earlier (▲), down = later (▼)
export type Bucket = "green" | "yellow" | "red";

export type Category = {
  id: string; // stable key, e.g. "countries"
  label: string; // display name, e.g. "Countries"
  emoji: string; // e.g. "🌍"
  note: string; // short source/rule note
  items: string[]; // canonical display names (unsorted in source; engine sorts)
  aliases?: Record<string, string>; // normalized alias -> canonical item
};

export type GuessRow = {
  item: string; // canonical guessed item
  distance: number; // |index(guess) - index(answer)| in sorted list
  dir: Direction;
  bucket: Bucket;
};

/**
 * Canonical normalisation used for all matching and dedup comparisons:
 * lowercase -> strip accents (NFD) -> collapse every run of non-alphanumerics
 * to a single space -> trim.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
