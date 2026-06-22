import { NextResponse } from "next/server";
import { buildArxivUrl, parseArxivFeed } from "@/lib/arxiv";
import { topicById } from "@/lib/topics";

export const runtime = "edge";

export async function GET(request: Request) {
  const topicId = new URL(request.url).searchParams.get("topic");
  const topic = topicById(topicId);

  try {
    const res = await fetch(buildArxivUrl(topic.arxiv), {
      headers: { Accept: "application/atom+xml" },
    });
    if (!res.ok) throw new Error(`arXiv responded ${res.status}`);
    const paper = parseArxivFeed(await res.text());
    if (!paper) throw new Error("No paper found for this topic");

    return NextResponse.json(
      { paper, topic: { id: topic.id, label: topic.label } },
      {
        // Newest paper changes slowly; cache for an hour.
        headers: { "Cache-Control": "public, s-maxage=3600, max-age=600" },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not load a paper: ${message}` },
      { status: 502 },
    );
  }
}
