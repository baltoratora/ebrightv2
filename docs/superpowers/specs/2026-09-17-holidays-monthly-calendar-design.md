# Holidays Monthly Calendar — Redesign Spec

**Date:** 2026-09-17
**Status:** Approved
**Supersedes the page layout of:** `2026-09-17-public-holidays-page-design.md` (the data module and the concept are unchanged; only the `/holidays` page presentation and the homepage mini-calendar change).

## Goal

Replace the annual 12-month-card view on `/holidays` with a **single-month day-grid calendar**. Default to the current month, highlight today, start weeks on **Monday**. Add top controls: a **year dropdown**, a **month selector** (12 buttons, 2 rows × 6 columns), and an **HQ / Branch location toggle**. The location toggle shades that location's non-working (rest) days in the grid and flags any holiday that lands on a rest day. Also switch the homepage's decorative mini-calendar to Monday-start.

## Working-day model (business rule)

- **HQ** works **Tue–Sat** → rest days = **Sunday, Monday**.
- **Branch** works **Wed–Sun** → rest days = **Monday, Tuesday**.

Using JS `getUTCDay()` (Sun=0 … Sat=6):
- `REST.HQ = new Set([0, 1])` (Sun, Mon)
- `REST.BRANCH = new Set([1, 2])` (Mon, Tue)

A public holiday only yields an extra day off when it falls on a working day. A holiday whose weekday is in the selected location's rest set is flagged "falls on a rest day". (Replacement/`cuti ganti` is **not** computed — the seed already encodes observed dates.)

## Architecture

Three files; still fully static (no D1, no API, no build step, no data change):

1. **`landing/holidays.js`** — **unchanged.** Global `const HOLIDAYS` of 38 `{ date, name, scope, states, provisional }` entries. Weekday and rest-day status are derived at render time.
2. **`landing/holidays.html`** — **rewritten** body + CSS + inline render logic. Render is keyed on a single state object `{ year, month, location }` (month is 0–11). All render JS is inline vanilla JS, same style as the rest of `landing/`.
3. **`landing/index.html`** — **small edit** to the mini-calendar script: Monday-start week (headers `M T W T F S S`, leading-blank offset shifted). Stays decorative (keeps today-highlight; no holiday marking, no rest-day shading).

## `/holidays` page

### Top controls
- **Year** — `<select>` populated from the distinct years in `HOLIDAYS` (2026, 2027). Changing it re-renders, keeping the selected month + location.
- **Location** — segmented `HQ` / `Branch` buttons; the active one is highlighted. Default **HQ**.
- **Month** — 12 `<button>`s in a CSS grid of **2 rows × 6 columns** (Jan–Jun on row 1, Jul–Dec on row 2). The selected month is highlighted. Clicking one re-renders.
- Region color legend (Federal `#ff5d8f` · Selangor `#38bdf8` · Kuala Lumpur `#fbbf24` · Putrajaya `#34d399`).

### Calendar grid
- Month title, e.g. "September 2026".
- 7-column day grid. Column headers **Mo Tu We Th Fr Sa Su** (Monday first).
- **Leading blanks** before day 1 computed Monday-based: `lead = (jsDay(firstOfMonth) + 6) % 7` where `jsDay` uses the UTC parse (Sun=0).
- **Today ring:** if `year === currentYear && month === currentMonth`, the cell for `currentDay` gets an accent ring/badge. "Current" is from the browser's `new Date()`.
- **Holiday days:** a day that has ≥1 holiday shows the region color(s) — a colored dot (one per region for that day) under/!on the day number. Federal → pink dot.
- **Rest-day shading:** the weekday columns in the selected location's rest set get a subtle greyed background across all rows (header + day cells). HQ → Mon & Sun columns; Branch → Mon & Tue columns.

### Holidays-this-month list (below grid)
- Header "Holidays this month" (or "No public holidays this month" when empty).
- One row per holiday in the selected month/year, sorted by date: color dot(s) · `Wed 16` (weekday + zero-padded day) · name · region label(s). Provisional holidays keep the `*` marker.
- If the holiday's weekday is in the selected location's rest set, append a muted note: **"— falls on a rest day"**.
- Footnote (kept): `* Subject to change — lunar sighting / gazette dependent. Source: JPM cabinet gazette (HKA 2026 / 2027).`

### State & interactions
- State: `{ year: string, month: number(0-11), location: 'HQ'|'BRANCH' }`.
- Initial state: current month + current year if that year exists in the data, else the earliest data year with month January; location `HQ`.
- Year change, month-button click, and location toggle each mutate state and call `render()`. No prev/next arrows (out of scope by request).

## Homepage mini-calendar (`index.html`)

Only the calendar script changes:
- Day-of-week headers become `["M", "T", "W", "T", "F", "S", "S"]`.
- Leading blanks: `const lead = (new Date(y, m, 1).getDay() + 6) % 7;` then render `lead` empty cells before day 1.
- Everything else (today highlight, month title, styling) unchanged. No holiday data on the homepage.

## Testing / Verification

- **Headless render harness** (Node + DOM shim, like the prior page) executing the new inline script against the real `HOLIDAYS`, asserting:
  - Month selector renders 12 buttons; year `<select>` has one option per data year; location toggle present with HQ default active.
  - Grid headers are Mon-first (`Mo … Su`); leading-blank count correct for a known month (e.g. Sep 2026 starts Tuesday → 1 leading blank).
  - Today ring present when rendering the current month/year; absent otherwise.
  - Holiday day marking present for a known holiday (e.g. 16 Sep 2026).
  - Rest-day shading: HQ shades Mon & Sun columns; Branch shades Mon & Tue columns.
  - List rest-day flags: *Hari Wesak* (Sun 31 May 2026) flagged for HQ, **not** for Branch; *Tahun Baharu Cina* (Tue 17 Feb 2026) flagged for Branch, **not** for HQ.
- **`landing/index.html`**: assert Monday-start headers and that Sep 2026 (1st = Tuesday) renders 1 leading blank.
- `npm test` stays green (343/343) — no `lib/` changes.
- User browser eyeball of `/holidays` (desktop + mobile) after deploy.

## Out of Scope (YAGNI)

- Prev/next month arrows (navigation is year dropdown + month buttons).
- `cuti ganti` / replacement-day computation (seed already encodes observed dates).
- Per-location holiday marking on the homepage mini-calendar (homepage stays decorative).
- Persisting the selected location/month across visits.
