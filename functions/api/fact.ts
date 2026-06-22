import { buildFactUrl, parseFact } from "../../lib/fact";

// Pages Function: GET /api/fact -> today's fun fact (uselessfacts, keyless).
// ?random=1 -> a fresh random fact (used by the Refresh button).
export const onRequestGet: PagesFunction = async ({ request }) => {
  const random = new URL(request.url).searchParams.has("random");
  try {
    const res = await fetch(buildFactUrl(random), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Facts API responded ${res.status}`);
    const fact = parseFact(await res.json());
    if (!fact) throw new Error("Could not parse fact");

    return Response.json(fact, {
      headers: {
        "Cache-Control": random
          ? "no-store"
          : "public, s-maxage=3600, max-age=600",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      { error: `Could not load today's fact: ${message}` },
      { status: 502 },
    );
  }
};
