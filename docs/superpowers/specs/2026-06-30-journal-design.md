# Journal Feature Design

**Date:** 2026-06-30  
**Status:** Approved

## Goal

Add a public journal (blog-style) to the Baltoratora landing site at `www.baltoratora.my/journal`. Anyone can read; trusted people with the secret key can write entries. Entries are stored in the existing Cloudflare D1 database.

## Architecture

Five pieces — no new projects, no new databases, no cross-origin requests:

1. **Button in `landing/index.html`** — a second `.cta`-style link below the `.cal` section, pointing to `/journal`
2. **`landing/journal.html`** — self-contained static page, same dark-cosmic CSS + starfield as the landing page
3. **`landing/functions/api/journal.ts`** — Pages Function (auto-discovered by `wrangler pages deploy landing`); handles GET (list) and POST (create)
4. **D1 table `journal_entries`** — in the existing `baltoratora-scores` database (`f4b11b0d-f418-47ef-8b5d-7719b1b7e8b6`); created on first cold start via `CREATE TABLE IF NOT EXISTS`
5. **Cloudflare dashboard one-time setup** — bind `DB` and set `JOURNAL_SECRET` env var on the `baltoratora-landing` project

## Data Schema

```sql
CREATE TABLE IF NOT EXISTS journal_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL  -- ISO 8601, e.g. "2026-06-30T14:22:00Z"
);
```

## API Contract

### `GET /api/journal`
- Auth: none (public)
- Returns: `{ entries: [{ id, title, body, created_at }] }` newest-first, max 100 rows
- Errors: 500 on DB failure

### `POST /api/journal`
- Auth: `key` field in JSON body checked against `env.JOURNAL_SECRET`
- Request body: `{ title: string, body: string, key: string }`
- Constraints: title ≤ 200 chars, body ≤ 10 000 chars
- Returns: `{ entry: { id, title, body, created_at } }` on success
- Errors: 400 (missing/invalid fields), 401 (wrong key), 500 (DB failure)

## Journal Page UI (`journal.html`)

- Same dark-cosmic theme as `index.html` (same CSS variables, same starfield JS, same font)
- **Header**: "Journal" h1 + back link (`← www.baltoratora.my`)
- **Write form** (always visible, at top): Title input, Body textarea, Secret Key password input, "Post" button
  - Success: new entry prepended to list, form cleared
  - Wrong key: inline red error "Wrong key."
  - Network error: "Couldn't save — try again."
- **Entry list** (below form): title (bold), date (small, muted), body text; newest first
  - Empty state: "No entries yet."
- All JS is inline in the HTML file (no framework, same pattern as `index.html`)

## Auth + Security

- `JOURNAL_SECRET` stored as Cloudflare env var — never in the repo
- Key travels in POST body over HTTPS
- Body capped at 10 000 chars to prevent abuse
- Key is shared among trusted writers; revocation = rotate env var in dashboard
- Basic rate limiting via Cloudflare free-tier WAF (no custom logic needed)

## Deployment

Deploy command unchanged: `npx wrangler pages deploy landing --project-name=baltoratora-landing`

One-time Cloudflare dashboard steps (cannot be automated in code):
1. Go to Pages → `baltoratora-landing` → Settings → Functions → D1 database bindings
2. Add binding: variable name `DB`, database `baltoratora-scores`
3. Go to Settings → Environment variables → Add `JOURNAL_SECRET` (Production + Preview)
