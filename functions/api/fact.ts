import { buildFactUrl, parseFact } from "../../lib/fact";

// Pages Function: GET /api/fact -> today's fun fact (uselessfacts, keyless).
export const onRequestGet: PagesFunction = async () => {
  try {
    const res = await fetch(buildFactUrl(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Facts API responded ${res.status}`);
    const fact = parseFact(await res.json());
    if (!fact) throw new Error("Could not parse fact");

    return Response.json(fact, {
      headers: { "Cache-Control": "public, s-maxage=3600, max-age=600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      { error: `Could not load today's fact: ${message}` },
      { status: 502 },
    );
  }
};
