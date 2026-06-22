import { buildArxivUrl, parseArxivFeed } from "../../lib/arxiv";
import { topicById } from "../../lib/topics";

// Pages Function: GET /api/paper?topic=<id> -> newest arXiv paper for a topic.
export const onRequestGet: PagesFunction = async ({ request }) => {
  const topicId = new URL(request.url).searchParams.get("topic");
  const topic = topicById(topicId);

  try {
    const res = await fetch(buildArxivUrl(topic.arxiv), {
      headers: { Accept: "application/atom+xml" },
    });
    if (!res.ok) throw new Error(`arXiv responded ${res.status}`);
    const paper = parseArxivFeed(await res.text());
    if (!paper) throw new Error("No paper found for this topic");

    return Response.json(
      { paper, topic: { id: topic.id, label: topic.label } },
      { headers: { "Cache-Control": "public, s-maxage=3600, max-age=600" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      { error: `Could not load a paper: ${message}` },
      { status: 502 },
    );
  }
};
