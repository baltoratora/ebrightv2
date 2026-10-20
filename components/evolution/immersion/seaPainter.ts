// Original procedural habitat illustration. Seeded visual variation is NOT
// simulation RNG. A sprite is an illustrative population sample, not one animal.
import type { Period, RegionId } from "@/lib/evolution/sim/state";

export interface SeaFrame {
  period: Period; region: RegionId; density: number; stressed: boolean;
  time: number; swimming: boolean; populated: boolean;
}
const seed = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
type C = CanvasRenderingContext2D;
function ellipse(c: C, x: number, y: number, rx: number, ry: number, color: string | CanvasGradient) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill();
}
function path(c: C, draw: (c: C) => void, fill: string | CanvasGradient, stroke?: string, width = 1) {
  c.beginPath(); draw(c); c.fillStyle = fill; if (fill !== "transparent") c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function sponge(c: C, x: number, y: number, height: number, n: number, time: number, color: string) {
  const width = height * .13, sway = Math.sin(time * .3 + n) * height * .018;
  c.save(); c.translate(x, y);
  const g = c.createLinearGradient(-width, -height, width, 0); g.addColorStop(0, color); g.addColorStop(1, "#123f43");
  path(c, p => { p.moveTo(-width, 0); p.bezierCurveTo(-width * 1.5, -height * .4, sway - width, -height * .8, sway - width * .7, -height);
    p.quadraticCurveTo(sway, -height - 5, sway + width * .7, -height); p.bezierCurveTo(sway + width, -height * .8, width * 1.6, -height * .35, width, 0); p.closePath(); }, g, "#abc3ab25", .7);
  ellipse(c, sway, -height, width * .7, width * .25, "#183d3f");
  for (let i = 0; i < 14; i++) ellipse(c, (seed(n + i * 20) - .5) * width * 1.2, -height * seed(n * 100 + i), 1, 1.4, "#adcdb53a");
  c.restore();
}
function frond(c: C, x: number, y: number, height: number, n: number, time: number) {
  const sway = Math.sin(time * .35 + n) * height * .05;
  path(c, p => { p.moveTo(x, y); p.quadraticCurveTo(x + sway, y - height * .45, x + sway * .5, y - height); }, "transparent", "#6b9f8755", 1.2);
  for (let k = 0; k < 8; k++) { const yy = y - height * k / 9, xx = x + sway * Math.sin(k / 9 * Math.PI);
    for (const d of [-1, 1]) path(c, p => { p.moveTo(xx, yy); p.quadraticCurveTo(xx + d * height * .22, yy - height * .025, xx + d * height * .12, yy - height * .12); }, "transparent", "#61957870", height * .018);
  }
}
function smallSwimmer(c: C, x: number, y: number, scale: number, time: number, flip: boolean) {
  c.save(); c.translate(x, y); c.scale(scale * (flip ? -1 : 1), scale);
  const tail = Math.sin(time * 3) * 6;
  path(c, p => { p.moveTo(45, 0); p.lineTo(74, -15 + tail); p.quadraticCurveTo(67, tail, 74, 15 + tail); p.closePath(); }, "#abd8ba75");
  const g = c.createLinearGradient(0, -13, 0, 14); g.addColorStop(0, "#b8d2af"); g.addColorStop(1, "#5c988d");
  ellipse(c, 0, 0, 48, 13, g);
  ellipse(c, -31, -3, 3, 3, "#12343a"); c.restore();
}
const water: Record<Period, [string, string, string]> = {
  cambrian: ["#367d79", "#145461", "#052a39"],
  ordovician: ["#458c87", "#1a5a65", "#052a3c"],
  silurian: ["#4b947d", "#1e655f", "#082f3a"],
  devonian: ["#668c70", "#2d655b", "#10383c"],
};

export function paintSea(c: C, w: number, h: number, s: SeaFrame) {
  const { time: t, region } = s, deep = region === "deepAnoxic", pelagic = region === "openOcean";
  const colors = water[s.period];
  const g = c.createLinearGradient(0, 0, w * .55, h); g.addColorStop(0, deep ? "#153a47" : colors[0]); g.addColorStop(.4, colors[1]); g.addColorStop(1, colors[2]);
  c.clearRect(0, 0, w, h); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const glow = c.createRadialGradient(w * .18, -30, 0, w * .18, -30, w);
  glow.addColorStop(0, "#bad3a946"); glow.addColorStop(.7, "#5b9f8a08"); glow.addColorStop(1, "#071f3500"); c.fillStyle = glow; c.fillRect(0, 0, w, h);
  if (!deep) for (let i = 0; i < 7; i++) { const x = w * (.03 + i * .16) + Math.sin(t * .07 + i) * 12;
    path(c, p => { p.moveTo(x - 20, -10); p.lineTo(x + 35, -10); p.lineTo(x + w * .18 + 90, h); p.lineTo(x + w * .08, h); p.closePath(); }, "#c4dfae0b"); }
  // Three independent depth layers, without a raster texture or heavy filters.
  for (let layer = 0; layer < 3; layer++) {
    const yy = h * (.65 + layer * .08);
    path(c, p => { p.moveTo(0, h); p.lineTo(0, yy); for (let i = 0; i <= 14; i++) p.lineTo(i * w / 14, yy + Math.sin(i * .8 + layer * 2) * 17 + Math.cos(i * 1.7) * 12); p.lineTo(w, h); p.closePath(); }, ["#174d53", "#10434b", "#0d3841"][layer]);
    if (!pelagic) for (let i = 0; i < 10; i++) sponge(c, w * i / 9 + layer * 17, yy + 40, 15 + seed(i + layer * 9) * 50, i + layer * 8, t, ["#416e67", "#50786a", "#527a6d"][layer]);
  }
  const floor = c.createLinearGradient(0, h * .75, 0, h); floor.addColorStop(0, "#42675b"); floor.addColorStop(1, "#0c303b");
  path(c, p => { p.moveTo(0, h * .84); p.bezierCurveTo(w * .2, h * .75, w * .35, h * .96, w * .55, h * .86); p.bezierCurveTo(w * .8, h * .7, w * .9, h * .88, w, h * .78); p.lineTo(w, h); p.lineTo(0, h); p.closePath(); }, floor);
  for (let i = 0; i < 75; i++) ellipse(c, seed(i + 122) * w, h * (.83 + seed(i + 89) * .17), seed(i + 5) * 3 + .5, seed(i + 3) * 1.3 + .4, "#afc4a720");
  // Decorative habitat plants are artistic silhouettes. No terrestrial animals.
  if ((s.period === "silurian" || s.period === "devonian") && ["river", "estuary", "tidalFlats"].includes(region)) {
    for (let i = 0; i < 9; i++) { const x = w * (.74 + i * .033), y = h * .63;
      path(c, p => { p.moveTo(x, y); p.lineTo(x, y - 35 - seed(i) * 28); p.moveTo(x, y - 25); p.lineTo(x - 6, y - 33); p.moveTo(x, y - 25); p.lineTo(x + 6, y - 35); }, "transparent", "#537b6555", 2); }
  }
  const count = s.populated ? Math.max(2, Math.min(24, Math.ceil(s.density * 24))) : 0;
  for (let i = 0; i < count; i++) { const x = ((seed(i + 91) * w + t * (s.swimming ? 6 : 3)) % (w + 90)) - 45, y = h * (.3 + seed(i + 34) * .3) + Math.sin(t * .4 + i) * 5;
    c.globalAlpha = .2 + seed(i + 9) * .3; smallSwimmer(c, x, y, .06 + seed(i) * .07, t + i, i % 2 === 0); c.globalAlpha = 1; }
  if (!pelagic && !deep) for (let i = 0; i < 18; i++) { const x = seed(i + 72) * w, y = h * (.85 + seed(i + 19) * .12);
    if (i % 3) sponge(c, x, y, 22 + seed(i + 2) * (region === "reef" ? 90 : 65), i + 2, t, ["#829a7c", "#b8a57d", "#6a9b87"][i % 3]); else frond(c, x, y, 35 + seed(i) * 65, i, t); }
  for (let i = 0; i < 70; i++) { const x = (seed(i * 2 + 50) * w + Math.sin(t * .1 + i) * 10 + t * seed(i + 22)) % w, y = (seed(i + 1) * h - t * (.5 + seed(i)) + h * 1000) % h;
    ellipse(c, x, y, .5 + seed(i + 2), .5 + seed(i + 2), i % 3 === 0 ? "#d7e8cd55" : "#d7e8cd22"); }
  if (s.stressed) { c.fillStyle = "#473c2d55"; c.fillRect(0, 0, w, h); }
  const vignette = c.createRadialGradient(w * .5, h * .35, h * .05, w * .5, h * .4, w * .7); vignette.addColorStop(0, "#00182500"); vignette.addColorStop(1, "#00131f99"); c.fillStyle = vignette; c.fillRect(0, 0, w, h);
}
