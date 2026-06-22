// Pages Function: POST /api/wallpaper { prompt } -> AI wallpaper (Workers AI).
// Uses Stable Diffusion XL so we can request a portrait phone aspect ratio
// (~19.5:9). Falls back to a deterministic placeholder if the AI binding is
// missing (e.g. local UI-only dev).

interface Env {
  AI?: {
    run: (
      model: string,
      input: unknown,
    ) => Promise<ReadableStream | { image?: string }>;
  };
}

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

// 19.5:9 portrait. Height is capped at SDXL's 2048 max; the phone scales this
// to its native resolution (e.g. 1206×2622), so the aspect ratio is what counts.
const WIDTH = 896;
const HEIGHT = 1944;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function mockWallpaper(prompt: string): string {
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) % 360;
  const c1 = `hsl(${h}, 70%, 22%)`;
  const c2 = `hsl(${(h + 60) % 360}, 75%, 45%)`;
  const c3 = `hsl(${(h + 180) % 360}, 65%, 30%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs><radialGradient id="g" cx="35%" cy="25%" r="90%">
      <stop offset="0%" stop-color="${c2}"/>
      <stop offset="55%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </radialGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
    <text x="50%" y="50%" fill="rgba(255,255,255,0.55)" font-family="sans-serif"
      font-size="34" text-anchor="middle">demo wallpaper · AI binding unavailable</text>
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
    const result = await env.AI.run(MODEL, {
      prompt: `${prompt}, vertical phone wallpaper, portrait composition`,
      width: WIDTH,
      height: HEIGHT,
      num_steps: 20,
    });

    // SDXL returns a binary image stream; turn it into a PNG data URL.
    const buf = await new Response(result as ReadableStream).arrayBuffer();
    if (!buf.byteLength) throw new Error("Model returned no image");
    return Response.json({
      image: `data:image/png;base64,${arrayBufferToBase64(buf)}`,
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
