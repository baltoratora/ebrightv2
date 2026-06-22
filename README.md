# baltoratora

A daily STEM page:

- 💡 **Fun fact of the day** — from [uselessfacts](https://uselessfacts.jsph.pl) (no key).
- 📄 **Paper of the day** — the newest paper in your chosen topic from the
  [arXiv API](https://arxiv.org/help/api) (no key).
- 🖼️ **Wallpaper generator** — AI art from **Cloudflare Workers AI** (Flux), with
  download.

Pick a STEM topic (AI/ML, Computer Vision, Quantum, Astrophysics, Math, Bio) to
switch the paper feed and seed the wallpaper prompt.

Built with Next.js, deployed to **Cloudflare Workers** via the
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter
(`wrangler deploy`). No external API keys — arXiv and uselessfacts are keyless,
and image generation uses a Cloudflare **Workers AI binding** (no token to
manage).

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests for the arXiv + fact parsers
```

The fun fact and paper work locally (public APIs). The Workers AI binding is
only available on Cloudflare, so locally the wallpaper generator returns a
**deterministic gradient placeholder**. To build/preview the real Worker:

```bash
npm run cf:preview   # opennext build + local Worker preview (needs the AI binding)
```

## Deploy to Cloudflare Workers

Deploys as a Worker via OpenNext. `wrangler deploy` runs the OpenNext build
first (see `[build]` in `wrangler.toml`), then ships the Worker. The `AI`
binding and `nodejs_compat` flag come from `wrangler.toml`, so no manual
dashboard binding setup is needed. Production URL: `baltoratora.<account>.workers.dev`.

- **Connected repo (CI):** the build runs `npx wrangler deploy`, which builds +
  deploys on every push to `main`.
- **From a machine with Cloudflare auth:** `npm run deploy`.

> Note: this gives a `workers.dev` URL. For a `pages.dev` URL instead, the
> project's deploy command must be `wrangler pages deploy .vercel/output/static`
> with the `@cloudflare/next-on-pages` build — a different adapter.

## Project structure

```
app/
  page.tsx                 layout + topic state
  api/fact/route.ts        daily fact (uselessfacts proxy)
  api/paper/route.ts       newest arXiv paper for a topic
  api/wallpaper/route.ts   Workers AI Flux image (mock fallback locally)
lib/
  topics.ts                STEM topics -> arXiv category + wallpaper seed
  arxiv.ts                 buildArxivUrl + parseArxivFeed (pure, tested)
  fact.ts                  buildFactUrl + parseFact (pure, tested)
components/                FunFact, TopicSelector, PaperOfDay, WallpaperGenerator
```
