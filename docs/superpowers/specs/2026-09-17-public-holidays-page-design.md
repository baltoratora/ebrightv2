# Public Holidays Page Design

**Date:** 2026-09-17
**Status:** Approved

## Goal

Make the decorative current-month calendar on the Baltoratora landing site
(`www.baltoratora.my`) actionable: clicking the month label opens a new page
listing Malaysian public holidays for the year, laid out as a 12-month grid.
Data covers 2026 and 2027 for Federal, Selangor, Kuala Lumpur, and Putrajaya,
sourced from `ebright_public_holidays_seed_2026_2027.sql` (JPM cabinet gazette).

No database and no API: the holiday set is fixed reference data, so it is
bundled statically into the page. This is deliberately simpler than the journal
feature (which uses D1) — there is nothing to write, nothing to migrate, and no
network failure mode.

## Architecture

Three files, no new projects, no new bindings:

1. **`landing/index.html`** — the month/year label (`#cal-head`, currently a
   plain `<div>`) becomes a tappable link to `/holidays`, styled to signal it is
   clickable (hover → accent color). The calendar grid below stays decorative.
2. **`landing/holidays.js`** — static data module: a global
   `const HOLIDAYS = [...]` converted from the SQL seed (see Data Module).
3. **`landing/holidays.html`** — self-contained static page, same dark-cosmic
   theme (CSS variables, starfield, font, back-link) as `index.html` /
   `journal.html`. Loads `holidays.js` via `<script src>`, then renders the grid
   for the selected year. All render JS is inline, vanilla (no framework), same
   pattern as the other landing pages.

`/holidays` resolves to `holidays.html` automatically (Cloudflare Pages clean
URLs), exactly as `/journal` → `journal.html` today.

## Data Module (`landing/holidays.js`)

One object per holiday:

```js
const HOLIDAYS = [
  // Federal: applies everywhere, states is empty
  { date: '2026-02-17', name: 'Tahun Baharu Cina', scope: 'federal', states: [], provisional: false },
  // Merged multi-state row: identical date + name across states collapse into one entry
  { date: '2026-03-07', name: 'Hari Nuzul Al-Quran', scope: 'state', states: ['SGR', 'KUL', 'PJY'], provisional: false },
  // Provisional (lunar / gazette-dependent)
  { date: '2026-03-21', name: 'Hari Raya Puasa', scope: 'federal', states: [], provisional: true },
  // ...
];
```

**Conversion rules from the SQL seed:**

- **Federal rows** → `scope: 'federal'`, `states: []`.
- **State rows** → `scope: 'state'`, `states: [<code>]` using the seed's
  `state_code` (`SGR`, `KUL`, `PJY`).
- **Merge rule:** rows sharing the *same date AND same name* collapse into a
  single entry whose `states` array lists every matching region. Rows whose
  names differ are kept separate — notably the 1→2 Feb 2026 Thaipusam entries
  (Selangor's "Hari Thaipusam (cuti ganti…)" vs KL/Putrajaya's "Hari Wilayah
  Persekutuan + Hari Thaipusam (cuti ganti…)") remain two distinct entries.
- **`provisional`** ← the seed's `is_provisional` flag (`TRUE`/`FALSE`).
- The seed's `year`, `id`, and `source_url` columns are dropped (year is derived
  from `date`; the rest are not needed for display).

KL and Putrajaya have identical holiday sets in the seed, so their two entries
always co-occur after merging — expected, not a bug.

Expected result: **38 entries** spanning 2026–2027 (19 per year = 15 federal +
4 merged state entries each year), from 46 raw seed rows.

## Region Color Coding

A legend at the top of the page maps region → color. Each holiday row shows a
colored dot per region (federal = one dot; a merged multi-state entry shows one
dot per state).

| Region              | Code  | Color            |
|---------------------|-------|------------------|
| Federal (nationwide)| —     | brand pink `#ff5d8f` |
| Selangor            | `SGR` | cyan `#38bdf8`   |
| Kuala Lumpur        | `KUL` | amber `#fbbf24`  |
| Putrajaya           | `PJY` | green `#34d399`  |

## Page UI (`holidays.html`)

- **Theme:** same dark-cosmic CSS + starfield as `index.html`; reuse the CSS
  variables (`--bg`, `--text`, `--muted`, `--accent`, `--border`).
- **Header:** `← BALTORATORA` back-link (to `/`), "Public Holidays" gradient
  `h1`, small muted subtitle.
- **Year toggle:** two buttons `2026` / `2027`; defaults to the current year
  (2026). Switching re-renders the grid in place (no navigation).
- **Legend:** the four region color chips with labels.
- **Month grid:** 12 month cards (Jan→Dec, reading order) in a
  **3-column × 4-row** CSS grid. Responsive: 3 columns → 2 → 1 as width
  narrows (`@media` breakpoints matching the landing page's approach).
  - Each card: month name header + the holidays that fall in that month for the
    selected year, each as `[dot(s)] DD  ·  Name`.
  - Months with no holidays render a dimmed `—` placeholder so the grid stays
    even.
- **Provisional marker:** a `*` after the name, plus a footnote at the bottom:
  *"* Subject to change — lunar sighting / gazette dependent."*
- **Rendering:** on load and on year-toggle, filter `HOLIDAYS` by the selected
  year, bucket by month (0–11), sort within each month by date, and render.
  All in-memory; no fetch.

## Deployment

Deploy command unchanged:

```
npx wrangler pages deploy landing --project-name=baltoratora-landing
```

The new `holidays.html` and `holidays.js` are picked up as static assets in the
`landing/` directory. No Cloudflare dashboard changes (no bindings, no env vars).

## Verification / Testing

- The repo's Vitest suite covers `lib/` (game/app logic), not the landing HTML,
  so there is no automated test hook for this page. `npm test` will still be run
  before committing to confirm nothing else regressed (per the "never commit
  before green" rule).
- **Data reconcile:** confirm `HOLIDAYS.length === 38` (19 per year: 15 federal
  + 4 merged state entries each), reconciling the 46 raw seed rows minus merges.
- **Local eyeball:** open `holidays.html` locally and check the 3×4 grid, year
  toggle, color dots/legend, and provisional footnote render correctly; confirm
  the month link on `index.html` navigates to it.

## Out of Scope (YAGNI)

- Marking holiday dates directly on the landing-page calendar grid (dots on
  days) — not requested.
- Years beyond 2026–2027, auto-fetching official gazettes, or any admin UI to
  edit holidays. When 2028 data is needed, append rows to `holidays.js`.
- Weekend / cuti-ganti computation — the seed already encodes observed dates.
