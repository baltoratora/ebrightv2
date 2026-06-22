// Daily "fun fact" via uselessfacts (no key). Its /today endpoint returns the
// same fact for the whole day, so it's naturally daily-stable.

export interface Fact {
  text: string;
  source?: string;
}

const FACTS_API = "https://uselessfacts.jsph.pl/api/v2/facts";

/** URL for today's fact (stable for the day, server-side). */
export function buildFactUrl(): string {
  return `${FACTS_API}/today`;
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
