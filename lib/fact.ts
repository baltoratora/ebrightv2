// Daily "fun fact" via uselessfacts (no key). Its /today endpoint returns the
// same fact for the whole day, so it's naturally daily-stable.

export interface Fact {
  text: string;
  source?: string;
}

const FACTS_API = "https://uselessfacts.jsph.pl/api/v2/facts";

/** URL for the fact: today's (stable for the day) or a random one (for refresh). */
export function buildFactUrl(random = false): string {
  return `${FACTS_API}/${random ? "random" : "today"}`;
}

/** Parse the uselessfacts JSON payload into our Fact shape. */
export function parseFact(raw: unknown): Fact | null {
  const r = raw as { text?: unknown; source?: unknown };
  if (typeof r?.text !== "string" || r.text.trim() === "") return null;
  return {
    text: r.text.trim(),
    source: typeof r.source === "string" ? r.source : undefined,
  };
}
