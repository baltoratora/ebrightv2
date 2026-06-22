import { NextResponse } from "next/server";
import { buildFactUrl, parseFact } from "@/lib/fact";

export const runtime = "edge";

export async function GET() {
  try {
    const res = await fetch(buildFactUrl(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Facts API responded ${res.status}`);
    const fact = parseFact(await res.json());
    if (!fact) throw new Error("Could not parse fact");

    return NextResponse.json(fact, {
      // Stable for the day; cache hard at the edge.
      headers: { "Cache-Control": "public, s-maxage=3600, max-age=600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not load today's fact: ${message}` },
      { status: 502 },
    );
  }
}
