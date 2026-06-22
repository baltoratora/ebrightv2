# baltoratora

A daily STEM page:

- 💡 **Fun fact of the day** — from [uselessfacts](https://uselessfacts.jsph.pl) (no key).
- 📄 **Paper of the day** — the newest paper in your chosen topic from the
  [arXiv API](https://arxiv.org/help/api) (no key).
- 🖼️ **Wallpaper generator** — AI art from **Cloudflare Workers AI** (Flux), with
  download.

Pick a STEM topic (AI/ML, Computer Vision, Quantum, Astrophysics, Math, Bio) to
switch the paper feed and seed the wallpaper prompt.

Built with Next.js, deployed to **Cloudflare Pages**. No external API keys —
arXiv and Numbers API are keyless, and image generation uses a Cloudflare
**Workers AI binding** (no token to manage).

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests for the arXiv + fact parsers
```

The fun fact and paper work locally (public APIs). The Workers AI binding is
only available on Cloudflare, so locally the wallpaper generator returns a
**deterministic gradient placeholder**. To exercise the real model locally:

```bash
npm run pages:dev    # builds with next-on-pages + runs wrangler with the AI binding
```

## Deploy to Cloudflare Pages (one-time)

1. Push to GitHub (`baltoratora/ebrightv2`).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   pick the repo.
3. Build settings:
   - **Framework preset:** Next.js
   - **Build command:** `npx @cloudflare/next-on-pages`
   - **Build output directory:** `.vercel/output/static`
4. Settings → **Functions**:
   - Add compatibility flag **`nodejs_compat`**.
   - Add a **Workers AI** binding named **`AI`** (Bindings → Add → Workers AI).
5. (Optional) Lock the site to your team: **Zero Trust → Access → Applications**,
   add the Pages domain, allow specific emails.

## CI/CD (automatic after setup)

Cloudflare's native Git integration — no GitHub Actions needed:

- **Push to `main`** → builds and deploys to production.
- **Open a PR** → builds a preview deployment with its own URL.

Your loop with Claude Code:

```bash
npm test
git add -A && git commit -m "…"
git push           # Cloudflare builds + deploys
```

## Project structure

```
app/
  page.tsx                 layout + topic state
  api/fact/route.ts        edge: daily fact (uselessfacts proxy)
  api/paper/route.ts       edge: newest arXiv paper for a topic
  api/wallpaper/route.ts   edge: Workers AI Flux image (mock fallback locally)
lib/
  topics.ts                STEM topics -> arXiv category + wallpaper seed
  arxiv.ts                 buildArxivUrl + parseArxivFeed (pure, tested)
  fact.ts                  buildFactUrl + parseFact (pure, tested)
components/                FunFact, TopicSelector, PaperOfDay, WallpaperGenerator
```
