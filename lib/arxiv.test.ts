import { describe, it, expect } from "vitest";
import { buildArxivUrl, parseArxivFeed } from "./arxiv";

describe("buildArxivUrl", () => {
  it("queries the category, newest first", () => {
    const url = buildArxivUrl("cs.LG");
    expect(url).toContain("search_query=cat%3Acs.LG");
    expect(url).toContain("sortBy=submittedDate");
    expect(url).toContain("sortOrder=descending");
    expect(url).toContain("max_results=1");
  });
});

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.12345v1</id>
    <published>2024-01-22T18:00:00Z</published>
    <title>A Study of
      Deep Learning &amp; Things</title>
    <summary>  We show that models can
      learn representations that &lt;generalize&gt; well.  </summary>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2401.99999v1</id>
    <title>Second paper</title>
  </entry>
</feed>`;

describe("parseArxivFeed", () => {
  it("returns null when there are no entries", () => {
    expect(parseArxivFeed("<feed></feed>")).toBeNull();
  });

  it("parses the first entry only", () => {
    const paper = parseArxivFeed(SAMPLE_FEED);
    expect(paper?.title).toBe("A Study of Deep Learning & Things");
    expect(paper?.url).toBe("http://arxiv.org/abs/2401.12345v1");
    expect(paper?.published).toBe("2024-01-22T18:00:00Z");
  });

  it("decodes entities and collapses whitespace in the summary", () => {
    const paper = parseArxivFeed(SAMPLE_FEED);
    expect(paper?.summary).toBe(
      "We show that models can learn representations that <generalize> well.",
    );
  });

  it("collects all authors in order", () => {
    const paper = parseArxivFeed(SAMPLE_FEED);
    expect(paper?.authors).toEqual(["Ada Lovelace", "Alan Turing"]);
  });
});
