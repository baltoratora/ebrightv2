// Pages Function: POST /api/wallpaper { prompt } -> AI wallpaper (Workers AI).
// The `AI` binding is provided by Cloudflare (see wrangler.toml). Falls back to
// a deterministic placeholder if the binding is missing (e.g. local UI-only dev).

interface Env {
  AI?: { run: (model: string, input: unknown) => Promise<{ image?: string }> };
}

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

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
      font-size="22" text-anchor="middle">demo wallpaper · AI binding unavailable</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let prompt = "";
  try {
    const body = (await request.json()) as { prompt?: unknown };
    prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    /* invalid body -> handled below */
  }

  if (!prompt) {
    return Response.json({ error: "A prompt is required." }, { status: 400 });
  }
  if (prompt.length > 800) prompt = prompt.slice(0, 800);

  if (!env.AI) {
    return Response.json({ image: mockWallpaper(prompt), mock: true });
  }

  try {
    const result = await env.AI.run(MODEL, { prompt, steps: 6 });
    if (!result?.image) throw new Error("Model returned no image");
    return Response.json({
      image: `data:image/jpeg;base64,${result.image}`,
      mock: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json(
      { error: `Image generation failed: ${message}` },
      { status: 502 },
    );
  }
};
