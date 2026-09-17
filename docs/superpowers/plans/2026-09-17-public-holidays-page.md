# Public Holidays Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing-page calendar's month label open a `/holidays` page that lists Malaysian public holidays for 2026–2027 as a 12-month grid.

**Architecture:** Pure static addition to the `baltoratora-landing` Pages project — a bundled data module (`landing/holidays.js`) plus a self-contained page (`landing/holidays.html`), linked from the existing month label in `landing/index.html`. No D1, no API, no build step, no Cloudflare dashboard changes.

**Tech Stack:** Static HTML/CSS + vanilla JS (same dark-cosmic pattern as `landing/journal.html`). Node is used only for a one-off data reconcile check. The repo's Vitest suite (`npm test`) covers `lib/` and stays green throughout (untouched).

**Spec:** `docs/superpowers/specs/2026-09-17-public-holidays-page-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `landing/holidays.js` (create) | Static `const HOLIDAYS = [...]` — 38 entries derived from the SQL seed. Data only. |
| `landing/holidays.html` (create) | The page: theme, year toggle, region legend, 3×4 month grid, render logic. Presentation only; consumes `HOLIDAYS`. |
| `landing/index.html` (modify) | Turn the `#cal-head` month label into a link to `/holidays`. |

Data (`holidays.js`) and presentation (`holidays.html`) are split so the yearly data update is a single isolated file with no markup around it.

**Working branch:** `feat/public-holidays-page` (already created; the spec is already committed here).

---

## Task 1: Holiday data module (`landing/holidays.js`)

**Files:**
- Create: `landing/holidays.js`

The data is verified with a Node reconcile check (run via a heredoc — nothing is written to disk, so nothing pollutes the deployed `landing/` directory). The check is the "test": it asserts the conversion from the 46-row SQL seed to 38 merged entries is exact.

- [ ] **Step 1: Run the reconcile check to verify it fails (file does not exist yet)**

Run (from repo root):

```bash
node <<'EOF'
const fs = require('fs');
const src = fs.readFileSync('landing/holidays.js', 'utf8');
const HOLIDAYS = (new Function(src + '; return HOLIDAYS;'))();
const assert = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exit(1); } };
const y = (yr) => HOLIDAYS.filter(h => h.date.startsWith(yr + '-'));
assert(HOLIDAYS.length === 38, 'total entries should be 38, got ' + HOLIDAYS.length);
assert(y('2026').length === 19, '2026 entries should be 19, got ' + y('2026').length);
assert(y('2027').length === 19, '2027 entries should be 19, got ' + y('2027').length);
assert(y('2026').filter(h => h.scope === 'federal').length === 15, '2026 federal should be 15');
assert(y('2027').filter(h => h.scope === 'federal').length === 15, '2027 federal should be 15');
assert(HOLIDAYS.filter(h => h.provisional).length === 11, 'provisional should be 11');
const keys = HOLIDAYS.map(h => h.date + '|' + h.name);
assert(new Set(keys).size === keys.length, 'duplicate (date,name) entries found');
const VALID = new Set(['SGR', 'KUL', 'PJY']);
for (const h of HOLIDAYS) {
  assert(/^20\d\d-\d\d-\d\d$/.test(h.date), 'bad date ' + h.date);
  assert(h.scope === 'federal' || h.scope === 'state', 'bad scope ' + h.scope);
  if (h.scope === 'federal') assert(h.states.length === 0, 'federal must have empty states: ' + h.name);
  else { assert(h.states.length > 0, 'state must have states: ' + h.name); h.states.forEach(s => assert(VALID.has(s), 'bad state code ' + s)); }
}
console.log('OK: ' + HOLIDAYS.length + ' entries (2026=' + y('2026').length + ', 2027=' + y('2027').length + ', provisional=' + HOLIDAYS.filter(h => h.provisional).length + ')');
EOF
```

Expected: FAIL — `ENOENT: no such file or directory, open 'landing/holidays.js'`.

- [ ] **Step 2: Create the data module**

Create `landing/holidays.js` with exactly this content:

```js
// Malaysian public holidays for the Baltoratora landing calendar.
// Source: JPM cabinet gazette (HKA-2026 / HKA_2027), via
// ebright_public_holidays_seed_2026_2027.sql. Regions: Federal (nationwide),
// Selangor (SGR), Kuala Lumpur (KUL), Putrajaya (PJY).
//
// Merge rule applied to the seed: rows with the same date AND same name are
// collapsed into one entry whose `states` array lists every matching region.
// Federal entries have scope 'federal' and states []. Rows whose names differ
// (e.g. the 2026-02-02 Thaipusam variants) are kept separate.
//
// `provisional: true` = lunar-sighting / gazette-dependent; may shift.
// To add a future year, append rows here — no build step, no database.
const HOLIDAYS = [
  // ── 2026 · Federal ──────────────────────────────────────────────
  { date: '2026-02-17', name: 'Tahun Baharu Cina', scope: 'federal', states: [], provisional: false },
  { date: '2026-02-18', name: 'Tahun Baharu Cina (Hari Kedua)', scope: 'federal', states: [], provisional: false },
  { date: '2026-03-21', name: 'Hari Raya Puasa', scope: 'federal', states: [], provisional: true },
  { date: '2026-03-22', name: 'Hari Raya Puasa (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2026-05-01', name: 'Hari Pekerja', scope: 'federal', states: [], provisional: false },
  { date: '2026-05-27', name: 'Hari Raya Qurban', scope: 'federal', states: [], provisional: true },
  { date: '2026-05-28', name: 'Hari Raya Qurban (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2026-05-31', name: 'Hari Wesak', scope: 'federal', states: [], provisional: false },
  { date: '2026-06-01', name: 'Hari Keputeraan Rasmi Agong', scope: 'federal', states: [], provisional: false },
  { date: '2026-06-17', name: 'Awal Muharam (Maal Hijrah)', scope: 'federal', states: [], provisional: false },
  { date: '2026-08-25', name: 'Maulidur Rasul', scope: 'federal', states: [], provisional: false },
  { date: '2026-08-31', name: 'Hari Kebangsaan', scope: 'federal', states: [], provisional: false },
  { date: '2026-09-16', name: 'Hari Malaysia', scope: 'federal', states: [], provisional: false },
  { date: '2026-11-08', name: 'Hari Deepavali', scope: 'federal', states: [], provisional: true },
  { date: '2026-12-25', name: 'Hari Krismas', scope: 'federal', states: [], provisional: false },
  // ── 2026 · State ────────────────────────────────────────────────
  { date: '2026-02-02', name: 'Hari Thaipusam (cuti ganti — gazetted 1 Feb, Sun)', scope: 'state', states: ['SGR'], provisional: false },
  { date: '2026-02-02', name: 'Hari Wilayah Persekutuan + Hari Thaipusam (cuti ganti — gazetted 1 Feb, Sun)', scope: 'state', states: ['KUL', 'PJY'], provisional: false },
  { date: '2026-03-07', name: 'Hari Nuzul Al-Quran', scope: 'state', states: ['SGR', 'KUL', 'PJY'], provisional: false },
  { date: '2026-12-11', name: 'Hari Keputeraan Sultan Selangor', scope: 'state', states: ['SGR'], provisional: false },
  // ── 2027 · Federal ──────────────────────────────────────────────
  { date: '2027-02-06', name: 'Tahun Baharu Cina', scope: 'federal', states: [], provisional: false },
  { date: '2027-02-07', name: 'Tahun Baharu Cina (Hari Kedua)', scope: 'federal', states: [], provisional: false },
  { date: '2027-03-10', name: 'Hari Raya Puasa', scope: 'federal', states: [], provisional: true },
  { date: '2027-03-11', name: 'Hari Raya Puasa (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2027-05-01', name: 'Hari Pekerja', scope: 'federal', states: [], provisional: false },
  { date: '2027-05-17', name: 'Hari Raya Qurban', scope: 'federal', states: [], provisional: true },
  { date: '2027-05-18', name: 'Hari Raya Qurban (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2027-05-20', name: 'Hari Wesak', scope: 'federal', states: [], provisional: false },
  { date: '2027-06-06', name: 'Awal Muharam (Maal Hijrah)', scope: 'federal', states: [], provisional: false },
  { date: '2027-06-07', name: 'Hari Keputeraan Rasmi Agong', scope: 'federal', states: [], provisional: false },
  { date: '2027-08-15', name: 'Maulidur Rasul', scope: 'federal', states: [], provisional: false },
  { date: '2027-08-31', name: 'Hari Kebangsaan', scope: 'federal', states: [], provisional: false },
  { date: '2027-09-16', name: 'Hari Malaysia', scope: 'federal', states: [], provisional: false },
  { date: '2027-10-28', name: 'Hari Deepavali', scope: 'federal', states: [], provisional: true },
  { date: '2027-12-25', name: 'Hari Krismas', scope: 'federal', states: [], provisional: false },
  // ── 2027 · State ────────────────────────────────────────────────
  { date: '2027-01-22', name: 'Hari Thaipusam', scope: 'state', states: ['SGR', 'KUL', 'PJY'], provisional: false },
  { date: '2027-02-01', name: 'Hari Wilayah Persekutuan', scope: 'state', states: ['KUL', 'PJY'], provisional: false },
  { date: '2027-02-24', name: 'Hari Nuzul Al-Quran', scope: 'state', states: ['SGR', 'KUL', 'PJY'], provisional: false },
  { date: '2027-12-11', name: 'Hari Keputeraan Sultan Selangor (falls Saturday — confirm cuti ganti before use)', scope: 'state', states: ['SGR'], provisional: true },
];
```

- [ ] **Step 3: Run the reconcile check to verify it passes**

Run the same `node <<'EOF' ... EOF` block from Step 1.
Expected: `OK: 38 entries (2026=19, 2027=19, provisional=11)`.

- [ ] **Step 4: Confirm the test suite is still green (per "never commit before green")**

Run: `npm test`
Expected: `Test Files 25 passed (25)`, `Tests 343 passed (343)`.

- [ ] **Step 5: Commit**

```bash
git add landing/holidays.js
git commit -m "$(cat <<'EOF'
feat(landing): add bundled public-holidays data (2026-2027)

38 entries merged from the JPM gazette SQL seed; federal + SGR/KUL/PJY.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Holidays page (`landing/holidays.html`)

**Files:**
- Create: `landing/holidays.html`

Consumes the global `HOLIDAYS` from Task 1 (loaded via `<script src="holidays.js">` — a sibling static file). No automated DOM test (the repo has no jsdom setup, a deliberate prior decision); verification is a served-page eyeball with explicit expected results.

- [ ] **Step 1: Create the page**

Create `landing/holidays.html` with exactly this content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Public Holidays · BALTORATORA</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #05060d;
        --bg-2: #0a0c18;
        --text: #eef1f8;
        --muted: #9aa0b8;
        --accent: #ff5d8f;
        --accent-2: #c2185b;
        --border: rgba(255, 255, 255, 0.1);
      }
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
      body {
        background:
          radial-gradient(1100px 700px at 80% -10%, rgba(194, 24, 91, 0.22), transparent),
          radial-gradient(900px 600px at -10% 20%, rgba(91, 60, 255, 0.18), transparent),
          var(--bg);
        color: var(--text);
        font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system,
          "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
        overflow-x: hidden;
        position: relative;
      }
      #stars { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
      .star {
        position: absolute;
        border-radius: 50%;
        background: #fff;
        opacity: 0.7;
        animation: twinkle var(--dur) ease-in-out infinite alternate;
      }
      @keyframes twinkle { from { opacity: 0.15; } to { opacity: 0.9; } }

      .wrap {
        position: relative;
        z-index: 1;
        max-width: 1040px;
        margin: 0 auto;
        padding: clamp(40px, 8vh, 80px) max(20px, env(safe-area-inset-left))
          max(56px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-right));
      }

      .back-link {
        display: inline-flex; align-items: center; gap: 6px;
        color: var(--muted); text-decoration: none;
        font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
        margin-bottom: 32px; transition: color 0.15s;
      }
      .back-link:hover { color: var(--text); }

      h1 {
        font-size: clamp(28px, 6vw, 48px); font-weight: 800; margin: 0 0 8px;
        background: linear-gradient(180deg, #ffffff 0%, #ffd7e6 60%, var(--accent) 130%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .subtitle { color: var(--muted); font-size: 14px; margin: 0 0 28px; }

      .controls {
        display: flex; flex-wrap: wrap; align-items: center;
        justify-content: space-between; gap: 16px; margin-bottom: 32px;
      }
      .year-toggle { display: inline-flex; gap: 6px; }
      .year-btn {
        padding: 8px 18px; border-radius: 999px;
        background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border);
        color: var(--muted); font-family: inherit; font-size: 14px; font-weight: 700;
        cursor: pointer; transition: all 0.15s;
      }
      .year-btn:hover { color: var(--text); }
      .year-btn.active {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #fff; border-color: transparent;
      }
      .legend { display: flex; flex-wrap: wrap; gap: 14px; }
      .legend-item {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12px; color: var(--muted); font-weight: 600;
      }
      .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

      .month-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
      .month-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border); border-radius: 14px;
        padding: 16px 18px; min-height: 120px;
      }
      .month-name {
        font-size: 12px; font-weight: 700; letter-spacing: 0.12em;
        text-transform: uppercase; color: var(--accent); margin: 0 0 12px;
      }
      .holiday {
        display: flex; align-items: flex-start; gap: 8px;
        font-size: 13px; line-height: 1.45; margin-bottom: 10px;
      }
      .holiday:last-child { margin-bottom: 0; }
      .holiday-dots { display: inline-flex; gap: 3px; padding-top: 5px; flex-shrink: 0; }
      .holiday-day {
        color: var(--muted); font-weight: 700; flex-shrink: 0;
        min-width: 48px; font-variant-numeric: tabular-nums;
      }
      .holiday-name { color: var(--text); }
      .prov { color: var(--accent); font-weight: 700; }
      .month-empty { color: var(--muted); opacity: 0.4; font-size: 20px; }

      .footnote { margin-top: 28px; font-size: 12px; color: var(--muted); line-height: 1.6; }

      @media (max-width: 780px) { .month-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 480px) { .month-grid { grid-template-columns: 1fr; } }
      @media (prefers-reduced-motion: reduce) { .star { animation: none; } }
    </style>
  </head>
  <body>
    <div id="stars" aria-hidden="true"></div>
    <main class="wrap">
      <a class="back-link" href="/">← BALTORATORA</a>
      <h1>Public Holidays</h1>
      <p class="subtitle">Malaysia · Federal &amp; Selangor / Kuala Lumpur / Putrajaya</p>

      <div class="controls">
        <div class="year-toggle" id="year-toggle" role="group" aria-label="Select year"></div>
        <div class="legend" id="legend" aria-label="Region legend"></div>
      </div>

      <div class="month-grid" id="month-grid"></div>

      <p class="footnote">
        <span class="prov">*</span> Subject to change — lunar sighting / gazette dependent.
        Source: JPM cabinet gazette (HKA 2026 / 2027).
      </p>
    </main>

    <script src="holidays.js"></script>
    <script>
      // --- starfield (same as landing) ---
      (function () {
        var host = document.getElementById("stars");
        var n = Math.min(160, Math.floor((window.innerWidth * window.innerHeight) / 9000));
        var frag = document.createDocumentFragment();
        for (var i = 0; i < n; i++) {
          var s = document.createElement("div");
          s.className = "star";
          var size = Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1;
          s.style.width = s.style.height = size + "px";
          s.style.left = Math.random() * 100 + "%";
          s.style.top = Math.random() * 100 + "%";
          s.style.setProperty("--dur", (2 + Math.random() * 4).toFixed(1) + "s");
          frag.appendChild(s);
        }
        host.appendChild(frag);
      })();

      var REGIONS = {
        FED: { label: "Federal", color: "#ff5d8f" },
        SGR: { label: "Selangor", color: "#38bdf8" },
        KUL: { label: "Kuala Lumpur", color: "#fbbf24" },
        PJY: { label: "Putrajaya", color: "#34d399" },
      };
      var MONTHS = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
      var DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

      var YEARS = [];
      HOLIDAYS.forEach(function (h) {
        var yr = h.date.slice(0, 4);
        if (YEARS.indexOf(yr) === -1) YEARS.push(yr);
      });
      YEARS.sort();

      function esc(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      }
      // Parse 'YYYY-MM-DD' in UTC so weekday/day never drift with the viewer's timezone.
      function parts(date) {
        var p = date.split("-");
        return { y: +p[0], m: +p[1], d: +p[2] };
      }
      function weekday(date) {
        var p = parts(date);
        return DOW[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
      }
      function regionCodes(h) {
        return h.scope === "federal" ? ["FED"] : h.states;
      }
      function dotsHtml(h) {
        return regionCodes(h).map(function (code) {
          var r = REGIONS[code];
          return '<span class="dot" style="background:' + r.color + '" title="' + r.label + '"></span>';
        }).join("");
      }
      function holidayHtml(h) {
        var p = parts(h.date);
        var day = ("0" + p.d).slice(-2);
        var star = h.provisional ? '<span class="prov">*</span>' : "";
        return (
          '<div class="holiday">' +
            '<span class="holiday-dots">' + dotsHtml(h) + "</span>" +
            '<span class="holiday-day">' + weekday(h.date) + " " + day + "</span>" +
            '<span class="holiday-name">' + esc(h.name) + star + "</span>" +
          "</div>"
        );
      }

      function renderLegend() {
        document.getElementById("legend").innerHTML =
          ["FED", "SGR", "KUL", "PJY"].map(function (code) {
            var r = REGIONS[code];
            return '<span class="legend-item"><span class="dot" style="background:' +
              r.color + '"></span>' + r.label + "</span>";
          }).join("");
      }

      function renderYearToggle(active) {
        var el = document.getElementById("year-toggle");
        el.innerHTML = YEARS.map(function (yr) {
          return '<button type="button" class="year-btn' + (yr === active ? " active" : "") +
            '" data-year="' + yr + '">' + yr + "</button>";
        }).join("");
        Array.prototype.forEach.call(el.querySelectorAll(".year-btn"), function (btn) {
          btn.addEventListener("click", function () { render(btn.getAttribute("data-year")); });
        });
      }

      function render(year) {
        renderYearToggle(year);
        var byMonth = [];
        for (var i = 0; i < 12; i++) byMonth.push([]);
        HOLIDAYS.filter(function (h) { return h.date.slice(0, 4) === year; })
          .forEach(function (h) { byMonth[parts(h.date).m - 1].push(h); });
        byMonth.forEach(function (list) {
          list.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        });
        document.getElementById("month-grid").innerHTML =
          MONTHS.map(function (name, i) {
            var body = byMonth[i].length
              ? byMonth[i].map(holidayHtml).join("")
              : '<div class="month-empty">—</div>';
            return '<div class="month-card"><div class="month-name">' + name + "</div>" + body + "</div>";
          }).join("");
      }

      // Default to the current year if the data covers it, else the earliest year.
      (function () {
        renderLegend();
        var current = String(new Date().getFullYear());
        render(YEARS.indexOf(current) !== -1 ? current : YEARS[0]);
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 2: Serve the landing project and eyeball the page**

Run (from repo root; emulates Cloudflare Pages incl. the `/holidays` clean URL):

```bash
npx wrangler pages dev landing --port 8788
```

Open `http://localhost:8788/holidays` in a browser and confirm:
- Dark cosmic theme with starfield; `← BALTORATORA` back-link; "Public Holidays" gradient heading.
- Two year buttons **2026** / **2027**; 2026 is active by default (current year); clicking 2027 re-renders in place.
- A legend with four colored dots: Federal (pink), Selangor (cyan), Kuala Lumpur (amber), Putrajaya (green).
- A **3-column grid of 12 month cards** (Jan→Dec). February 2026 shows two entries (the SGR Thaipusam row and the KUL+PJY combined row); March shows Nuzul Al-Quran with three dots (cyan+amber+green); empty months show a dim `—`.
- Hari Raya / Qurban / Deepavali rows show a pink `*`; the footnote explains it.

Then narrow the window: grid collapses to 2 columns (<780px) and 1 column (<480px).

Stop the server with Ctrl-C when done.

- [ ] **Step 3: Confirm the test suite is still green**

Run: `npm test`
Expected: `Tests 343 passed (343)`.

- [ ] **Step 4: Commit**

```bash
git add landing/holidays.html
git commit -m "$(cat <<'EOF'
feat(landing): add /holidays page — 3x4 month grid + year toggle

Region-color-coded (Federal/SGR/KUL/PJY) holiday grid, current-year
default, provisional footnote. Static, consumes landing/holidays.js.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Link the calendar month to `/holidays` (`landing/index.html`)

**Files:**
- Modify: `landing/index.html` (the `.cal-head` CSS block ~lines 182-189, the `#cal-head` element ~line 309)

The JS that fills the label (`document.getElementById("cal-head").textContent = ...`, ~line 344) works unchanged on an `<a>`.

- [ ] **Step 1: Make the month label an anchor**

Replace this line:

```html
        <div class="cal-head" id="cal-head"></div>
```

with:

```html
        <a class="cal-head" id="cal-head" href="/holidays" title="View public holidays"></a>
```

- [ ] **Step 2: Add link styling to the `.cal-head` rule**

Replace this CSS block:

```css
      .cal-head {
        font-size: 14px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 16px;
        font-weight: 600;
      }
```

with:

```css
      .cal-head {
        display: inline-block;
        font-size: 14px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 16px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: color 0.15s;
      }
      .cal-head:hover {
        color: var(--accent);
        text-decoration: underline;
        text-underline-offset: 4px;
      }
```

- [ ] **Step 3: Verify the edit landed**

Run: `grep -n 'a class="cal-head" id="cal-head" href="/holidays"' landing/index.html`
Expected: one match (the anchor line).

Run: `grep -n '.cal-head:hover' landing/index.html`
Expected: one match (the hover rule).

- [ ] **Step 4: Eyeball the link on the landing page**

Run: `npx wrangler pages dev landing --port 8788`
Open `http://localhost:8788/` and confirm:
- The calendar month label (e.g. "SEPTEMBER 2026") still shows correctly, now underlines + turns pink on hover, and the cursor is a pointer.
- Clicking it navigates to `/holidays` (the page from Task 2).

Stop the server with Ctrl-C.

- [ ] **Step 5: Confirm the test suite is still green**

Run: `npm test`
Expected: `Tests 343 passed (343)`.

- [ ] **Step 6: Commit**

```bash
git add landing/index.html
git commit -m "$(cat <<'EOF'
feat(landing): link calendar month label to /holidays

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Final verification & deploy (deploy is user-gated)

**Files:** none (verification + deployment only)

- [ ] **Step 1: Full green + clean tree**

Run: `npm test`
Expected: `Tests 343 passed (343)`.

Run: `git status --short`
Expected: empty (all three commits landed, nothing uncommitted).

- [ ] **Step 2: Deploy — ONLY after the user confirms**

Deployment is outward-facing; do not run it without an explicit go-ahead from the user. When confirmed, run (from repo root):

```bash
npx wrangler pages deploy landing --project-name=baltoratora-landing
```

Then open `https://www.baltoratora.my/holidays` and confirm the page renders as in Task 2, and that the month label on `https://www.baltoratora.my/` links to it.

- [ ] **Step 3: Finish the branch**

Use the superpowers:finishing-a-development-branch skill to merge `feat/public-holidays-page` (or open a PR), per the user's preference.

---

## Self-Review

**Spec coverage:**
- Month label → `/holidays` link — Task 3. ✓
- Static bundled data (`holidays.js`), 38 merged entries, merge rule, provisional flag — Task 1 (+ reconcile check). ✓
- `holidays.html` dark-cosmic theme, back-link, heading — Task 2. ✓
- Year toggle (2026/2027, current-year default) — Task 2 (`renderYearToggle` / init). ✓
- 3×4 responsive month grid, empty-month `—` — Task 2 CSS + `render`. ✓
- Region color legend + per-region dots, merged multi-state dots — Task 2 (`REGIONS`, `dotsHtml`, `renderLegend`). ✓
- Provisional `*` + footnote — Task 2 (`holidayHtml`, footnote markup). ✓
- Deploy command unchanged, no dashboard changes — Task 4. ✓
- Verify via row-count reconcile + local eyeball; `npm test` green before commits — Tasks 1-4. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full file content or the exact edit. ✓

**Type/name consistency:** `HOLIDAYS` entry shape `{date, name, scope, states, provisional}` is identical in Task 1's data, Task 1's reconcile check, and Task 2's consumers (`parts`, `regionCodes`, `holidayHtml`). Region codes `FED/SGR/KUL/PJY` match between `REGIONS`, `renderLegend`, and `dotsHtml`. ✓
