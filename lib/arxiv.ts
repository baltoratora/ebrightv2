// arXiv Atom feed handling. The edge runtime has no DOMParser, so we extract
// fields with focused regexes. arXiv's feed format is stable and consistent.

export interface Paper {
  title: string;
  authors: string[];
  summary: string;
  published: string; // ISO date string from the feed
  url: string; // abstract page link
}

const ARXIV_API = "https://export.arxiv.org/api/query";

/** Build the query URL for the newest paper in a given arXiv category. */
export function buildArxivUrl(category: string, maxResults = 1): string {
  const params = new URLSearchParams({
    search_query: `cat:${category}`,
    sortBy: "submittedDate",
    sortOrder: "descending",
    start: "0",
    max_results: String(maxResults),
  });
  return `${ARXIV_API}?${params.toString()}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function clean(s: string): string {
  // Collapse the whitespace/newlines arXiv puts inside titles and abstracts.
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

function tagContent(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1] : null;
}

/** Parse the first <entry> from an arXiv Atom feed into a Paper. */
export function parseArxivFeed(xml: string): Paper | null {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entry) return null;
  const block = entry[1];

  const title = tagContent(block, "title");
  const summary = tagContent(block, "summary");
  const published = tagContent(block, "published");
  const id = tagContent(block, "id"); // arXiv uses <id> as the abs URL

  const authors: string[] = [];
  const authorRe = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
  let am: RegExpExecArray | null;
  while ((am = authorRe.exec(block)) !== null) {
    authors.push(clean(am[1]));
  }

  if (!title) return null;

  return {
    title: clean(title),
    authors,
    summary: summary ? clean(summary) : "",
    published: published ? clean(published) : "",
    url: id ? clean(id) : "",
  };
}
