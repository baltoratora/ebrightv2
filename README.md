# baltoratora

A daily STEM page:

- 💡 **Fun fact of the day** — from [uselessfacts](https://uselessfacts.jsph.pl) (no key).
- 📄 **Paper of the day** — the newest paper in your chosen topic from the
  [arXiv API](https://arxiv.org/help/api) (no key).
- 🖼️ **Wallpaper generator** — portrait phone wallpapers (~19.5:9) from
  **Cloudflare Workers AI** (Stable Diffusion XL), with
  download.

Pick a STEM topic (AI/ML, Computer Vision, Quantum, Astrophysics, Math, Bio) to
switch the paper feed and seed the wallpaper prompt.

Built with Next.js as a **static export** (`out/`) plus **Cloudflare Pages
Functions** (`functions/api/*`) for the API, deployed to **Cloudflare Pages**
(`baltoratora.pages.dev`). No external API keys — arXiv and uselessfacts are
keyless, and image generation uses a Cloudflare **Workers AI binding** (no token
to manage).

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests for the arXiv + fact parsers
```

`next dev` serves only the UI — Pages Functions (`/api/*`) are not served by it,
so data fetches 404 locally. To run the full stack (UI + Functions + AI binding)
locally, use the Wrangler preview:

```bash
npm run preview      # next build (export) + wrangler pages dev (serves functions/)
```

## Deploy to Cloudflare Pages

Static export (`out/`) + Pages Functions (`functions/`). The `AI` binding and
`nodejs_compat` come from `wrangler.toml`, so no manual dashboard binding setup
is needed. Production URL: `baltoratora.pages.dev`.

**One-time:** create a **Pages** project (Workers & Pages → Create → **Pages** →
Connect to Git → `baltoratora/ebrightv2`), production branch `main`, build command
`npx next build`, output directory `out`. Cloudflare then auto-deploys on every
push to `main`, and PRs get preview URLs — no deploy command needed.

To deploy from a machine with Cloudflare auth instead: `npm run deploy`.

## Project structure

```
app/
  page.tsx                 dashboard UI (client): fetch, charts, lists
functions/api/
  fact.ts                  GET /api/fact   — daily fact (uselessfacts)
  paper.ts                 GET /api/paper  — newest arXiv paper for a topic
  wallpaper.ts             POST /api/wallpaper — Workers AI SDXL portrait (env.AI)
lib/
  topics.ts                STEM topics -> arXiv category + wallpaper seed
  arxiv.ts                 buildArxivUrl + parseArxivFeed (pure, tested)
  fact.ts                  buildFactUrl + parseFact (pure, tested)
components/                FunFact, TopicSelector, PaperOfDay, WallpaperGenerator
```
