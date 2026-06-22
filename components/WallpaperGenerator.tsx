"use client";

import { useEffect, useState } from "react";

export function WallpaperGenerator({ seed }: { seed: string }) {
  const [prompt, setPrompt] = useState(seed);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  // When the topic changes, refresh the suggested prompt (unless the user typed
  // their own that no longer matches a seed).
  useEffect(() => {
    setPrompt(seed);
  }, [seed]);

  async function generate() {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Generation failed");
      setImage(body.image as string);
      setIsMock(Boolean(body.mock));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `baltoratora-wallpaper.${image.includes("image/svg") ? "svg" : "jpg"}`;
    a.click();
  }

  return (
    <div className="panel">
      <h2>🖼️ Wallpaper generator</h2>

      {isMock ? (
        <div className="banner">
          Showing a demo placeholder. Deploy to Cloudflare (Workers AI) for real
          AI-generated wallpapers.
        </div>
      ) : null}

      <div className="gen-row">
        <input
          className="input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="Describe a wallpaper…"
          aria-label="Wallpaper prompt"
        />
        <button className="btn" onClick={generate} disabled={loading || !prompt.trim()}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="wallpaper-wrap">
        {loading ? (
          <div className="spinner" />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Generated wallpaper" />
        ) : error ? (
          <span className="muted">{error}</span>
        ) : (
          <span className="muted">Pick a topic or write a prompt, then Generate.</span>
        )}
      </div>

      {image && !loading ? (
        <div className="wallpaper-actions">
          <button className="btn ghost" onClick={download}>
            Download
          </button>
          <button className="btn ghost" onClick={generate}>
            Regenerate
          </button>
        </div>
      ) : null}
    </div>
  );
}
