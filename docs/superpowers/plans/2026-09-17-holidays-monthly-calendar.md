# Holidays Monthly Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/holidays` annual 12-month-card view with a single-month, Monday-start day-grid calendar that has a year dropdown, a 2×6 month selector, and an HQ/Branch toggle that shades rest days and flags holidays landing on rest days; and switch the homepage mini-calendar to Monday-start.

**Architecture:** Fully static. `landing/holidays.html` is rewritten (CSS + inline vanilla JS keyed on `{year, month, location}`). `landing/holidays.js` is unchanged (weekday/rest-day derived at render). `landing/index.html` gets a two-line mini-calendar tweak. No D1/API/build.

**Tech Stack:** Static HTML/CSS + vanilla JS. Node used only for a headless DOM-shim render harness. `npm test` (Vitest over `lib/`) stays green.

**Spec:** `docs/superpowers/specs/2026-09-17-holidays-monthly-calendar-design.md`

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `landing/holidays.js` | Bundled holiday data (`const HOLIDAYS`, 38 entries) | **none** |
| `landing/holidays.html` | Monthly calendar page: controls, day grid, month list, render logic | **rewrite** |
| `landing/index.html` | Homepage mini-calendar week-start | **2-line edit** |

**Working branch:** `feat/holidays-monthly-calendar` (already created; spec already committed here).

**Rest-day model:** `getUTCDay()` values. HQ rest = `[0,1]` (Sun, Mon); Branch rest = `[1,2]` (Mon, Tue). Grid column → weekday map `COL_UTCDAY = [1,2,3,4,5,6,0]` (Mon…Sun).

---

## Task 1: Rewrite `/holidays` as a monthly calendar

**Files:**
- Modify (full rewrite): `landing/holidays.html`

The render logic is verified by executing it headlessly against the real `HOLIDAYS` with a DOM shim (the "test").

- [ ] **Step 1: Write the failing harness and run it against the current (old) page**

Run this from Git Bash (nothing is written to disk):

```bash
node <<'EOF'
const fs = require('fs');
const base = 'C:/Users/user/ebrightv2/landing/';
const js = fs.readFileSync(base + 'holidays.js', 'utf8');
const html = fs.readFileSync(base + 'holidays.html', 'utf8');
const scripts = [...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) { console.error('FAIL: no inline script'); process.exit(1); }
const inline = scripts[scripts.length - 1];

const store = {};
function elem() {
  return { _html:'', _text:'', _val:'',
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=v;},
    get textContent(){return this._text;}, set textContent(v){this._text=v;},
    get value(){return this._val;}, set value(v){this._val=v;},
    style:{setProperty(){}}, className:'',
    appendChild(){}, addEventListener(){}, querySelectorAll(){return [];} };
}
const document = {
  getElementById(id){ return store[id] || (store[id]=elem()); },
  createElement(){ return elem(); }, createDocumentFragment(){ return elem(); } };
const window = { innerWidth:1200, innerHeight:800 };
new Function('document','window', js + '\n' + inline)(document, window);

const fails=[]; const chk=(c,m)=>{ if(!c) fails.push(m); };
const count=(s,sub)=>s.split(sub).length-1;
const R=()=>store['calendar'].innerHTML;
const L=()=>store['month-list'].innerHTML;
const cur=new Date(); const curY=String(cur.getFullYear());

if (typeof globalThis.__setState !== 'function') { console.error('FAIL: __setState not exposed (old page?)'); process.exit(1); }

chk(store['year-select'].innerHTML.includes('value="2026"'), 'year select missing 2026');
chk(store['year-select'].innerHTML.includes('value="2027"'), 'year select missing 2027');
chk(count(store['legend'].innerHTML,'legend-item')===4, 'legend should have 4 items');

// September 2026, HQ
globalThis.__setState('2026', 8, 'HQ');
chk(store['cal-title'].textContent==='September 2026','title should be September 2026, got '+store['cal-title'].textContent);
chk(count(store['month-nav'].innerHTML,'month-btn')===12,'month-nav should have 12 buttons');
chk(store['month-nav'].innerHTML.includes('month-btn active" data-month="8"'),'September should be active');
chk(store['loc-toggle'].innerHTML.includes('loc-btn active" data-loc="HQ"'),'HQ should be active');
chk(R().indexOf('>Mo<') !== -1 && R().indexOf('>Mo<') < R().indexOf('>Su<'),'header should be Monday-first');
chk(count(R(),'class="dow')===7,'should have 7 day headers');
chk(R().includes('dow rest">Mo'),'HQ: Monday header rest-shaded');
chk(R().includes('dow rest">Su'),'HQ: Sunday header rest-shaded');
chk(!R().includes('dow rest">Tu'),'HQ: Tuesday header NOT rest-shaded');
chk(count(R(),'<div class="cal-cell"></div>')+count(R(),'<div class="cal-cell rest"></div>')===1,'Sep 2026 should have exactly 1 leading blank cell');
chk(count(R(),'class="cal-dot"')===1,'Sep grid should have exactly 1 holiday dot');
chk(R().includes('#ff5d8f'),'Sep holiday dot should be federal pink');
chk(L().includes('Hari Malaysia'),'list missing Hari Malaysia');
chk(L().includes('Wed 16'),'Hari Malaysia should render as Wed 16');
chk(L().includes('(Federal)'),'Hari Malaysia should be labelled Federal');
chk(!L().includes('falls on a rest day'),'Sep/HQ: nothing falls on a rest day');

// May 2026: Wesak (Sun 31) rest flag differs by location
globalThis.__setState('2026', 4, 'HQ');
{ const i=L().indexOf('Hari Wesak'); const seg=L().slice(i, i+140);
  chk(i!==-1,'May list missing Hari Wesak');
  chk(seg.includes('falls on a rest day'),'HQ: Wesak (Sun 31 May) should be flagged'); }
globalThis.__setState('2026', 4, 'BRANCH');
{ const i=L().indexOf('Hari Wesak'); const seg=L().slice(i, i+140);
  chk(seg.indexOf('falls on a rest day')===-1,'Branch: Wesak (Sun) should NOT be flagged'); }
chk(R().includes('dow rest">Mo'),'Branch: Monday header rest-shaded');
chk(R().includes('dow rest">Tu'),'Branch: Tuesday header rest-shaded');
chk(!R().includes('dow rest">Su'),'Branch: Sunday header NOT rest-shaded');

// Feb 2026: CNY (Tue 17) rest flag differs by location
globalThis.__setState('2026', 1, 'BRANCH');
{ const i=L().indexOf('Tue 17'); const seg=L().slice(i, i+160);
  chk(i!==-1,'Feb list missing Tue 17 (CNY)');
  chk(seg.includes('falls on a rest day'),'Branch: CNY (Tue 17 Feb) should be flagged'); }
globalThis.__setState('2026', 1, 'HQ');
{ const i=L().indexOf('Tue 17'); const seg=L().slice(i, i+160);
  chk(seg.indexOf('falls on a rest day')===-1,'HQ: CNY (Tue 17) should NOT be flagged'); }

// today ring (dynamic to run date)
if (store['year-select'].innerHTML.includes('value="'+curY+'"')) {
  globalThis.__setState(curY, cur.getMonth(), 'HQ');
  chk(count(R(),'today')===1,'current month should have exactly one today cell');
  globalThis.__setState(curY, (cur.getMonth()+6)%12, 'HQ');
  chk(count(R(),'today')===0,'non-current month should have no today cell');
}

if (fails.length){ console.error('FAIL:\n - '+fails.join('\n - ')); process.exit(1); }
console.log('OK: monthly calendar verified (Mon-start grid, rest shading, today ring, rest-day flags HQ/Branch)');
EOF
```

Expected: **FAIL** — `FAIL: __setState not exposed (old page?)` (the current `holidays.html` is the old 12-month-card version).

- [ ] **Step 2: Rewrite `landing/holidays.html`**

Replace the ENTIRE contents of `landing/holidays.html` with exactly this:

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
        --rest: rgba(255, 255, 255, 0.045);
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
        max-width: 680px;
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

      .controls-row {
        display: flex; flex-wrap: wrap; align-items: center;
        justify-content: space-between; gap: 16px; margin-bottom: 16px;
      }
      .year-label {
        display: inline-flex; align-items: center; gap: 8px;
        color: var(--muted); font-size: 12px; font-weight: 600;
        letter-spacing: 0.1em; text-transform: uppercase;
      }
      #year-select {
        background: rgba(255, 255, 255, 0.05); color: var(--text);
        border: 1px solid var(--border); border-radius: 8px;
        padding: 8px 12px; font-family: inherit; font-size: 14px;
        font-weight: 700; cursor: pointer;
      }
      .loc-toggle { display: inline-flex; gap: 6px; }
      .loc-btn {
        padding: 8px 18px; border-radius: 999px;
        background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border);
        color: var(--muted); font-family: inherit; font-size: 14px; font-weight: 700;
        cursor: pointer; transition: all 0.15s;
      }
      .loc-btn:hover { color: var(--text); }
      .loc-btn.active {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #fff; border-color: transparent;
      }

      .month-nav {
        display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
        margin-bottom: 24px;
      }
      .month-btn {
        padding: 9px 0; border-radius: 10px;
        background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border);
        color: var(--muted); font-family: inherit; font-size: 13px; font-weight: 700;
        cursor: pointer; transition: all 0.15s;
      }
      .month-btn:hover { color: var(--text); }
      .month-btn.active {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #fff; border-color: transparent;
      }

      .legend { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
      .legend-item {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12px; color: var(--muted); font-weight: 600;
      }
      .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

      .cal-title { font-size: 18px; font-weight: 800; margin: 0 0 12px; color: var(--text); }
      .calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
      .dow {
        text-align: center; font-size: 11px; font-weight: 700; color: var(--muted);
        padding: 6px 0; text-transform: uppercase; border-radius: 8px;
      }
      .dow.rest { background: var(--rest); }
      .cal-cell {
        aspect-ratio: 1 / 1; border-radius: 10px; border: 1px solid transparent;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 3px; font-size: 13px; color: var(--text);
      }
      .cal-cell.rest { background: var(--rest); }
      .cal-cell.today {
        border-color: var(--accent);
        box-shadow: 0 0 16px rgba(255, 93, 143, 0.35);
      }
      .cal-num { line-height: 1; }
      .cal-dots { display: flex; gap: 2px; height: 6px; align-items: center; }
      .cal-dot { width: 5px; height: 5px; border-radius: 50%; }

      .month-list { margin-top: 28px; }
      .mh-title {
        font-size: 12px; font-weight: 700; letter-spacing: 0.12em;
        text-transform: uppercase; color: var(--muted); margin: 0 0 14px;
      }
      .mh {
        display: flex; align-items: flex-start; gap: 8px;
        font-size: 13px; line-height: 1.5; margin-bottom: 10px;
      }
      .mh:last-child { margin-bottom: 0; }
      .mh-dots { display: inline-flex; gap: 3px; padding-top: 4px; flex-shrink: 0; }
      .mh-day {
        color: var(--muted); font-weight: 700; flex-shrink: 0;
        min-width: 52px; font-variant-numeric: tabular-nums;
      }
      .mh-name { color: var(--text); }
      .mh-region { color: var(--muted); }
      .mh-rest { color: var(--muted); font-style: italic; }
      .prov { color: var(--accent); font-weight: 700; }
      .mh-empty { color: var(--muted); font-size: 14px; }

      .footnote { margin-top: 28px; font-size: 12px; color: var(--muted); line-height: 1.6; }

      @media (max-width: 420px) {
        .cal-cell { font-size: 12px; }
        .month-btn { font-size: 12px; padding: 8px 0; }
      }
      @media (prefers-reduced-motion: reduce) { .star { animation: none; } }
    </style>
  </head>
  <body>
    <div id="stars" aria-hidden="true"></div>
    <main class="wrap">
      <a class="back-link" href="/">← BALTORATORA</a>
      <h1>Public Holidays</h1>
      <p class="subtitle">Malaysia · Federal &amp; Selangor / Kuala Lumpur / Putrajaya</p>

      <div class="controls-row">
        <label class="year-label" for="year-select">Year
          <select id="year-select"></select>
        </label>
        <div class="loc-toggle" id="loc-toggle" role="group" aria-label="Location"></div>
      </div>

      <div class="month-nav" id="month-nav" role="group" aria-label="Select month"></div>

      <div class="legend" id="legend" aria-label="Region legend"></div>

      <h2 class="cal-title" id="cal-title"></h2>
      <div class="calendar" id="calendar"></div>

      <div class="month-list" id="month-list"></div>

      <p class="footnote">
        <span class="prov">*</span> Subject to change — lunar sighting / gazette dependent.
        Source: JPM cabinet gazette (HKA 2026 / 2027).
      </p>
    </main>

    <script src="holidays.js"></script>
    <script>
      // --- starfield ---
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
      var MONTHS_FULL = ["January","February","March","April","May","June",
                         "July","August","September","October","November","December"];
      var MONTHS_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      var DOW_HEAD = ["Mo","Tu","We","Th","Fr","Sa","Su"];   // Monday-first column headers
      var DOW3 = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; // getUTCDay() -> label
      var COL_UTCDAY = [1, 2, 3, 4, 5, 6, 0];                  // grid column -> getUTCDay()
      var REST = { HQ: [0, 1], BRANCH: [1, 2] };               // HQ: Sun+Mon; Branch: Mon+Tue
      var LOC_LABEL = { HQ: "HQ", BRANCH: "Branch" };

      function esc(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      }
      function parts(date) { var p = date.split("-"); return { y: +p[0], m: +p[1], d: +p[2] }; }
      function utcDay(y, m0, d) { return new Date(Date.UTC(y, m0, d)).getUTCDay(); }
      function regionCodes(h) { return h.scope === "federal" ? ["FED"] : h.states; }
      function isRestDay(utc, location) { return REST[location].indexOf(utc) !== -1; }

      var YEARS = [];
      HOLIDAYS.forEach(function (h) {
        var yr = h.date.slice(0, 4);
        if (YEARS.indexOf(yr) === -1) YEARS.push(yr);
      });
      YEARS.sort();

      function buildLegend() {
        return ["FED", "SGR", "KUL", "PJY"].map(function (code) {
          var r = REGIONS[code];
          return '<span class="legend-item"><span class="dot" style="background:' +
            r.color + '"></span>' + r.label + "</span>";
        }).join("");
      }
      function buildLocToggle(active) {
        return ["HQ", "BRANCH"].map(function (loc) {
          return '<button type="button" class="loc-btn' + (loc === active ? " active" : "") +
            '" data-loc="' + loc + '">' + LOC_LABEL[loc] + "</button>";
        }).join("");
      }
      function buildMonthNav(active) {
        return MONTHS_ABBR.map(function (name, i) {
          return '<button type="button" class="month-btn' + (i === active ? " active" : "") +
            '" data-month="' + i + '">' + name + "</button>";
        }).join("");
      }

      function buildCalendar(year, month, location) {
        var y = +year;
        var lead = (utcDay(y, month, 1) + 6) % 7;
        var daysInMonth = new Date(Date.UTC(y, month + 1, 0)).getUTCDate();
        var cur = new Date();
        var todayD = (y === cur.getFullYear() && month === cur.getMonth()) ? cur.getDate() : -1;
        var byDay = {};
        HOLIDAYS.forEach(function (h) {
          var p = parts(h.date);
          if (p.y === y && p.m - 1 === month) {
            var arr = byDay[p.d] || (byDay[p.d] = []);
            regionCodes(h).forEach(function (c) { if (arr.indexOf(c) === -1) arr.push(c); });
          }
        });
        function colRest(col) { return isRestDay(COL_UTCDAY[col], location); }

        var html = "";
        for (var c = 0; c < 7; c++) {
          html += '<div class="dow' + (colRest(c) ? " rest" : "") + '">' + DOW_HEAD[c] + "</div>";
        }
        var idx = 0;
        for (var i = 0; i < lead; i++) {
          html += '<div class="cal-cell' + (colRest(idx % 7) ? " rest" : "") + '"></div>';
          idx++;
        }
        for (var d = 1; d <= daysInMonth; d++) {
          var col = idx % 7;
          var cls = "cal-cell" + (colRest(col) ? " rest" : "") + (d === todayD ? " today" : "");
          var dots = (byDay[d] || []).map(function (code) {
            return '<span class="cal-dot" style="background:' + REGIONS[code].color +
              '" title="' + REGIONS[code].label + '"></span>';
          }).join("");
          html += '<div class="' + cls + '"><span class="cal-num">' + d +
            '</span><span class="cal-dots">' + dots + "</span></div>";
          idx++;
        }
        return html;
      }

      function buildList(year, month, location) {
        var y = +year;
        var hols = HOLIDAYS.filter(function (h) {
          var p = parts(h.date); return p.y === y && p.m - 1 === month;
        }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        if (!hols.length) return '<p class="mh-empty">No public holidays this month.</p>';
        return '<div class="mh-title">Holidays this month</div>' + hols.map(function (h) {
          var p = parts(h.date);
          var day = ("0" + p.d).slice(-2);
          var wd = utcDay(p.y, p.m - 1, p.d);
          var codes = regionCodes(h);
          var dots = codes.map(function (code) {
            return '<span class="dot" style="background:' + REGIONS[code].color + '"></span>';
          }).join("");
          var star = h.provisional ? '<span class="prov">*</span>' : "";
          var labels = codes.map(function (code) { return REGIONS[code].label; }).join(", ");
          var rest = isRestDay(wd, location)
            ? ' <span class="mh-rest">— falls on a rest day</span>' : "";
          return '<div class="mh"><span class="mh-dots">' + dots + "</span>" +
            '<span class="mh-day">' + DOW3[wd] + " " + day + "</span>" +
            '<span class="mh-name">' + esc(h.name) + star +
            ' <span class="mh-region">(' + esc(labels) + ")</span>" + rest + "</span></div>";
        }).join("");
      }

      var state = { year: YEARS[0], month: 0, location: "HQ" };

      function render() {
        document.getElementById("year-select").value = state.year;
        document.getElementById("loc-toggle").innerHTML = buildLocToggle(state.location);
        document.getElementById("month-nav").innerHTML = buildMonthNav(state.month);
        document.getElementById("cal-title").textContent = MONTHS_FULL[state.month] + " " + state.year;
        document.getElementById("calendar").innerHTML = buildCalendar(state.year, state.month, state.location);
        document.getElementById("month-list").innerHTML = buildList(state.year, state.month, state.location);
      }

      (function init() {
        document.getElementById("legend").innerHTML = buildLegend();
        var sel = document.getElementById("year-select");
        sel.innerHTML = YEARS.map(function (y) {
          return '<option value="' + y + '">' + y + "</option>";
        }).join("");

        var cur = new Date();
        var curY = String(cur.getFullYear());
        if (YEARS.indexOf(curY) !== -1) { state.year = curY; state.month = cur.getMonth(); }

        sel.addEventListener("change", function (e) { state.year = e.target.value; render(); });
        document.getElementById("loc-toggle").addEventListener("click", function (e) {
          var b = e.target.closest("button"); if (!b) return;
          state.location = b.getAttribute("data-loc"); render();
        });
        document.getElementById("month-nav").addEventListener("click", function (e) {
          var b = e.target.closest("button"); if (!b) return;
          state.month = +b.getAttribute("data-month"); render();
        });

        render();
      })();

      // Exposed for the headless render harness; harmless in the browser.
      function __setState(year, month, location) {
        state.year = year; state.month = month; state.location = location; render();
      }
      try { globalThis.__setState = __setState; } catch (e) {}
    </script>
  </body>
</html>
```

IMPORTANT: preserve all special characters exactly — `←`, `·`, `&amp;`, the em-dash `—` in the footnote and in the `— falls on a rest day` string. UTF-8.

- [ ] **Step 3: Run the harness to verify it passes**

Run the same `node <<'EOF' ... EOF` block from Step 1.
Expected: `OK: monthly calendar verified (Mon-start grid, rest shading, today ring, rest-day flags HQ/Branch)`.

- [ ] **Step 4: Confirm the test suite is still green**

Run: `npm test`
Expected: `Test Files 25 passed (25)`, `Tests 343 passed (343)`.

- [ ] **Step 5: Commit**

```bash
git add landing/holidays.html
git commit -m "$(cat <<'EOF'
feat(landing): rebuild /holidays as a monthly calendar

Single-month Mon-start day grid, year dropdown + 2x6 month buttons +
HQ/Branch toggle. Shades each location's rest days and flags holidays
that land on a rest day. Today highlighted. Static; holidays.js unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Homepage mini-calendar → Monday-start

**Files:**
- Modify: `landing/index.html` (mini-calendar script, ~lines 356 and 363)

- [ ] **Step 1: Change the day-of-week header row**

Replace this line:

```js
        const dows = ["S", "M", "T", "W", "T", "F", "S"];
```

with:

```js
        const dows = ["M", "T", "W", "T", "F", "S", "S"];
```

- [ ] **Step 2: Shift the leading-blank offset to Monday-based**

Replace this line:

```js
        const firstDow = new Date(y, m, 1).getDay();
```

with:

```js
        const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
```

- [ ] **Step 3: Verify the edits landed and the old form is gone**

Run:
```bash
grep -c '\["M", "T", "W", "T", "F", "S", "S"\]' landing/index.html
grep -c '(new Date(y, m, 1).getDay() + 6) % 7' landing/index.html
grep -c '\["S", "M", "T", "W", "T", "F", "S"\]' landing/index.html
```
Expected: `1`, then `1`, then `0` (old Sunday-first array removed).

- [ ] **Step 4: Verify the Monday-start offset with a headless check**

September 2026 starts on a Tuesday, so a Monday-start grid must render exactly **1** empty leading cell. Run:

```bash
node <<'EOF'
// Replicate the homepage offset formula for Sep 2026 (month index 8).
const firstDow = (new Date(2026, 8, 1).getDay() + 6) % 7;
if (firstDow !== 1) { console.error('FAIL: expected 1 leading blank for Sep 2026, got ' + firstDow); process.exit(1); }
console.log('OK: homepage Monday-start offset = 1 leading blank for Sep 2026');
EOF
```
Expected: `OK: homepage Monday-start offset = 1 leading blank for Sep 2026`.
(Note: this uses local-time `new Date(2026, 8, 1)`, matching the homepage script. Sep 1 2026 is a Tuesday in every timezone.)

- [ ] **Step 5: Confirm the test suite is still green**

Run: `npm test`
Expected: `Tests 343 passed (343)`.

- [ ] **Step 6: Commit**

```bash
git add landing/index.html
git commit -m "$(cat <<'EOF'
feat(landing): start homepage mini-calendar on Monday

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Final verification, deploy (user-gated), branch finish

**Files:** none (verification + deployment only)

- [ ] **Step 1: Full green + clean tree**

Run: `npm test` → expect `Tests 343 passed (343)`.
Run: `git status --short` → expect empty.
Run: `git diff --stat main...HEAD -- landing/` → expect `holidays.html` and `index.html` changed (holidays.js NOT changed).

- [ ] **Step 2: Deploy — ONLY after the user confirms**

Deployment is outward-facing; do not run without explicit user go-ahead. When confirmed:

```bash
npx wrangler pages deploy landing --project-name=baltoratora-landing
```

(If wrangler is not authenticated, ask the user to run `! npx wrangler login` in the session first.)

Then verify production:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.baltoratora.my/holidays
curl -s https://www.baltoratora.my/holidays | grep -c 'month-nav'
```
Expected: `200`, then `1`. And ask the user to eyeball `www.baltoratora.my/holidays` (year dropdown, month buttons, HQ/Branch shading, today ring) on desktop + mobile.

- [ ] **Step 3: Finish the branch**

Use the superpowers:finishing-a-development-branch skill (PR or local merge, per the user's choice).

---

## Self-Review

**Spec coverage:**
- Single-month day grid, Monday-start, default current month, highlight today — Task 1 (`buildCalendar`, `lead`, `todayD`). ✓
- Year dropdown — Task 1 (`year-select` + options + change handler). ✓
- Month selector 2×6 clickable — Task 1 (`buildMonthNav`, `.month-nav` grid `repeat(6,1fr)` × 12 buttons). ✓
- HQ/Branch toggle shading rest days — Task 1 (`REST`, `COL_UTCDAY`, `colRest`, `.dow.rest`/`.cal-cell.rest`). ✓
- Holidays-this-month list + rest-day flag — Task 1 (`buildList`, `isRestDay`). ✓
- Region legend + provisional footnote kept — Task 1 (`buildLegend`, footnote markup). ✓
- Homepage mini-calendar Monday-start — Task 2. ✓
- `holidays.js` unchanged; static; deploy unchanged — Tasks 1-3. ✓

**Placeholder scan:** none — every code step has full content; harness is complete. ✓

**Type/name consistency:** `state {year:string, month:number, location:'HQ'|'BRANCH'}` used consistently across `render`, `buildCalendar`, `buildList`, handlers, and `__setState`. `REGIONS` codes `FED/SGR/KUL/PJY` consistent between `buildLegend`, `buildCalendar`, `buildList`. `REST`/`COL_UTCDAY`/`isRestDay` consistent. Harness assertions match rendered class names (`month-btn`, `loc-btn`, `dow rest`, `cal-cell`, `cal-dot`, `today`, `mh-rest` text). ✓
