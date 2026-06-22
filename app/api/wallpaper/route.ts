import { NextResponse } from "next/server";

export const runtime = "edge";

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

interface FluxResult {
  image?: string; // base64-encoded JPEG
}

/**
 * Try to get the Cloudflare Workers AI binding. Only present when running on
 * Cloudflare (production or `wrangler pages dev`). Returns null under `next dev`.
 */
async function getAI(): Promise<{ run: (model: string, input: unknown) => Promise<FluxResult> } | null> {
  try {
    const mod = await import("@cloudflare/next-on-pages");
    const ctx = mod.getRequestContext();
    return (ctx.env as { AI?: { run: (m: string, i: unknown) => Promise<FluxResult> } }).AI ?? null;
  } catch {
    return null;
  }
}

/** Deterministic gradient placeholder used for local dev (no AI binding). */
function mockWallpaper(prompt: string): string {
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) % 360;
  const c1 = `hsl(${h}, 70%, 22%)`;
  const c2 = `hsl(${(h + 60) % 360}, 75%, 45%)`;
  const c3 = `hsl(${(h + 180) % 360}, 65%, 30%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <defs><radialGradient id="g" cx="35%" cy="30%" r="90%">
      <stop offset="0%" stop-color="${c2}"/>
      <stop offset="55%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </radialGradient></defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
    <text x="50%" y="94%" fill="rgba(255,255,255,0.5)" font-family="sans-serif"
      font-size="22" text-anchor="middle">demo wallpaper · deploy for AI art</text>
  </svg>`;
  // btoa is available in the edge runtime.
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export async function POST(request: Request) {
  let prompt = "";
  try {
    const body = (await request.json()) as { prompt?: unknown };
    prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    /* empty/invalid body -> handled below */
  }

  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }
  if (prompt.length > 800) prompt = prompt.slice(0, 800);

  const ai = await getAI();

  // Local dev: no binding available, return a deterministic placeholder.
  if (!ai) {
    return NextResponse.json({ image: mockWallpaper(prompt), mock: true });
  }

  try {
    const result = await ai.run(MODEL, { prompt, steps: 6 });
    if (!result?.image) throw new Error("Model returned no image");
    return NextResponse.json({
      image: `data:image/jpeg;base64,${result.image}`,
      mock: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Image generation failed: ${message}` },
      { status: 502 },
    );
  }
}
