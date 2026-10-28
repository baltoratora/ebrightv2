"use client";
import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Character2D from "./Character2D";
import { Look, Save, stats } from "@/lib/aether";
export type WorldHUD = {
  hp: number;
  mana: number;
  enemy: string;
  enemyHP: number;
  enemyMax: number;
  combo: number;
  cool: number[];
  message: string;
};
export type WorldCommand = { id: number; action: number };
type Props = {
  look: Look;
  studio?: boolean;
  zoom?: number;
  save: Save;
  paused?: boolean;
  tier?: number;
  run?: number;
  training?: boolean;
  command?: WorldCommand;
  onReward?: (boss: boolean) => void;
  onHUD?: (h: WorldHUD) => void;
};
type Point = { x: number; z: number };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (p: Point) => {
  const len = Math.hypot(p.x, p.z);
  if (len > 9.5) {
    p.x *= 9.5 / len;
    p.z *= 9.5 / len;
  }
};
export default function World(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    if (props.studio) return;
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let width = 900,
      height = 620,
      unit = 25;
    const resize = () => {
      const box = el.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const dpr = Math.min(devicePixelRatio, 2);
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      unit = Math.min(width / 29, height / 24);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const hero: Point = { x: 0, z: 0 };
    let target: Point | null = null;
    const keys = new Set<string>();
    let hp = stats(latest.current.save).hp,
      mana = stats(latest.current.save).mana,
      elapsed = 0,
      invulnerable = 0,
      combo = 0,
      lastHit = -10,
      spawned = false,
      finished = false;
    let message = props.training
      ? "Training dummy — no rewards"
      : "Defeat five sentinels to summon the guardian.";
    const cool = [0, 0, 0, 0, 0];
    let commandId = latest.current.command?.id ?? 0;
    let swing = 0;
    let walking = false;
    type Enemy = Point & {
      hp: number;
      max: number;
      boss: boolean;
      timer: number;
      wind: number;
    };
    let enemies: Enemy[] = [];
    const tier = latest.current.tier ?? 1;
    const addEnemy = (x: number, z: number, boss: boolean) => {
      const max = (boss ? 250 : 65) * tier;
      enemies.push({ x, z, hp: max, max, boss, timer: 1, wind: 0 });
    };
    if (props.training) addEnemy(0, -3, false);
    else
      for (let i = 0; i < 5; i++)
        addEnemy(Math.cos(i * 1.25) * 6, Math.sin(i * 1.25) * 6, false);
    const images = new Map<string, HTMLImageElement>();
    const sprite = (look: Look) => {
      const key = JSON.stringify(look);
      let img = images.get(key);
      if (!img) {
        img = new Image();
        img.src =
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(renderToStaticMarkup(<Character2D look={look} />));
        images.set(key, img);
        if (images.size > 12) images.delete(images.keys().next().value!);
      }
      return img;
    };
    const effects: {
      x: number;
      z: number;
      color: string;
      life: number;
      size: number;
    }[] = [];
    const burst = (p: Point, color: string, size: number) =>
      effects.push({ ...p, color, life: 0.5, size });
    const action = (a: number) => {
      const current = latest.current;
      if (
        current.paused ||
        document.hidden ||
        hp <= 0 ||
        a < 0 ||
        a > 4 ||
        cool[a] > 0
      )
        return;
      const st = stats(current.save);
      if (a === 3) {
        hp = Math.min(st.hp, hp + st.hp * (0.4 + current.save.nodes[5] * 0.1));
        cool[a] = 12;
        message = "Healing draught";
        return;
      }
      if (a === 4) {
        invulnerable = 0.65;
        cool[a] = 2.5;
        const d = target
          ? { x: target.x - hero.x, z: target.z - hero.z }
          : { x: 1, z: 1 };
        const len = Math.hypot(d.x, d.z) || 1;
        hero.x += (d.x / len) * 2.5;
        hero.z += (d.z / len) * 2.5;
        clamp(hero);
        burst(hero, "#9eeaff", 0.6);
        return;
      }
      const need = [0, 18, 32][a];
      if (mana < need) {
        message = "Not enough mana";
        return;
      }
      const range = [2.8, 7, 4.6][a];
      const sorted = enemies
        .filter((e) => e.hp > 0)
        .sort((a, b) => distance(a, hero) - distance(b, hero));
      const targets = (a === 2 ? sorted : sorted.slice(0, 1)).filter(
        (e) => distance(e, hero) <= range,
      );
      if (!targets.length) {
        message = "Move closer to a target";
        return;
      }
      mana -= need;
      cool[a] = [0.48, 2.5, 6][a];
      combo = elapsed - lastHit < 1.6 ? Math.min(10, combo + 1) : 1;
      lastHit = elapsed;
      swing = 0.25;
      let total = 0;
      for (const e of targets) {
        const critical = Math.random() < st.crit;
        const damage = Math.round(
          st.attack *
            [
              1,
              1.8 * (1 + current.save.nodes[8] * 0.1),
              2.2 * (1 + current.save.nodes[2] * 0.15),
            ][a] *
            (critical ? 1.75 : 1) *
            (1 + combo * 0.025),
        );
        e.hp -= damage;
        total += damage;
        burst(e, critical ? "#ffdd94" : "#8ae6dd", 0.6);
        if (e.hp <= 0 && !props.training) current.onReward?.(e.boss);
        if (props.training) e.hp = e.max;
      }
      if (a === 2) burst(hero, "#bda4ff", range);
      message = `${["Strike", "Pulse", "Nova"][a]} · ${total} damage${combo > 1 ? " · " + combo + " combo" : ""}`;
    };
    const down = (e: KeyboardEvent) => {
      if (e.target !== el) return;
      const key = e.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)
      )
        e.preventDefault();
      keys.add(key);
      if (!e.repeat) {
        if (/^[1-4]$/.test(key)) action(+key - 1);
        if (key === " ") action(4);
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    const pointer = (e: PointerEvent) => {
      el.focus();
      const r = el.getBoundingClientRect(),
        sx = (e.clientX - r.left - width / 2) / unit,
        sy = (e.clientY - r.top - height * 0.46) / (unit * 0.5);
      target = { x: (sx + sy) / 2, z: (sy - sx) / 2 };
      clamp(target);
    };
    el.addEventListener("pointerdown", pointer);
    const project = (p: Point) => ({
      x: width / 2 + (p.x - p.z) * unit,
      y: height * 0.46 + (p.x + p.z) * unit * 0.5,
    });
    const diamond = (x: number, z: number) => {
      const p = project({ x, z });
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - unit * 0.5);
      ctx.lineTo(p.x + unit, p.y);
      ctx.lineTo(p.x, p.y + unit * 0.5);
      ctx.lineTo(p.x - unit, p.y);
      ctx.closePath();
    };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#152738");
      gradient.addColorStop(1, "#0b1421");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      for (let x = -10; x <= 10; x++)
        for (let z = -10; z <= 10; z++) {
          if (Math.hypot(x, z) > 10) continue;
          diamond(x, z);
          ctx.fillStyle = (x + z) % 2 ? "#344b50" : "#385256";
          ctx.fill();
          ctx.strokeStyle = "#4c64644d";
          ctx.stroke();
        }
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6,
          p = project({ x: Math.cos(a) * 10.5, z: Math.sin(a) * 10.5 });
        ctx.fillStyle = "#263944";
        ctx.fillRect(p.x - 8, p.y - 35, 16, 35);
        ctx.fillStyle = "#597478";
        ctx.fillRect(p.x - 10, p.y - 39, 20, 7);
        ctx.fillStyle = "#a4dace";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 54);
        ctx.lineTo(p.x + 6, p.y - 44);
        ctx.lineTo(p.x, p.y - 36);
        ctx.lineTo(p.x - 6, p.y - 44);
        ctx.fill();
      }
      for (const fx of effects) {
        const p = project(fx);
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = fx.life * 2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          p.x,
          p.y,
          fx.size * unit * (1.5 - fx.life),
          fx.size * unit * 0.5 * (1.5 - fx.life),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const current = latest.current;
      const actors = [
        ...enemies.filter((e) => e.hp > 0).map((e) => ({ p: e, enemy: e })),
        { p: hero, enemy: null },
      ].sort((a, b) => a.p.x + a.p.z - (b.p.x + b.p.z));
      for (const actor of actors) {
        const p = project(actor.p),
          e = actor.enemy;
        const size = (e?.boss ? 140 : 100) * Math.min(1, width / 700);
        ctx.fillStyle = "#07132266";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        if (e?.wind) {
          ctx.strokeStyle = "#ff7d77";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(
            p.x,
            p.y,
            (e.boss ? 3.5 : 1.8) * unit,
            (e.boss ? 3.5 : 1.8) * unit * 0.5,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        const look = e
          ? {
              ...current.look,
              gender: "male" as const,
              color: e.boss ? "#8b4565" : "#546575",
              hair: "#9b98ae",
              trim: e.boss ? "#f5b19e" : "#d9d8ae",
              style: "plate" as const,
              wings: e.boss,
            }
          : current.look;
        const img = sprite(look);
        const bounce =
          !e && swing > 0
            ? -5
            : (!e && walking) ||
                (e && !props.training && distance(e, hero) > 2.5)
              ? -Math.abs(Math.sin(elapsed * 10)) * 3
              : 0;
        if (img.complete && img.naturalWidth) {
          ctx.globalAlpha = !e && invulnerable > 0 ? 0.55 : 1;
          ctx.drawImage(
            img,
            p.x - size * 0.5,
            p.y - size * 1.43 + bounce,
            size,
            size * 1.625,
          );
          ctx.globalAlpha = 1;
        }
        if (e) {
          ctx.fillStyle = "#101b28";
          ctx.fillRect(p.x - 20, p.y - size * 1.35 - 6, 40, 4);
          ctx.fillStyle = "#df9390";
          ctx.fillRect(
            p.x - 20,
            p.y - size * 1.35 - 6,
            40 * Math.max(0, e.hp / e.max),
            4,
          );
        } else {
          ctx.strokeStyle = "#b9e9d6";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 20, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
    let frame = 0,
      last = performance.now(),
      ui = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const current = latest.current;
      if (!current.paused && !document.hidden && hp > 0) {
        elapsed += dt;
        cool.forEach((v, i) => (cool[i] = Math.max(0, v - dt)));
        invulnerable = Math.max(0, invulnerable - dt);
        swing = Math.max(0, swing - dt);
        const st = stats(current.save);
        hp = Math.min(hp, st.hp);
        mana = Math.min(st.mana, mana + st.regen * dt);
        if (current.command && current.command.id !== commandId) {
          commandId = current.command.id;
          action(current.command.action);
        }
        const dx =
            (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
            (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
          dz =
            (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
            (keys.has("w") || keys.has("arrowup") ? 1 : 0);
        let dir = { x: dx + dz, z: dz - dx };
        if (dx || dz) target = null;
        else if (target) {
          dir = { x: target.x - hero.x, z: target.z - hero.z };
          if (distance(hero, target) < 0.15) {
            target = null;
            dir = { x: 0, z: 0 };
          }
        }
        const len = Math.hypot(dir.x, dir.z);
        walking = len > 0.01;
        if (len > 0.01) {
          hero.x += (dir.x / len) * dt * 4;
          hero.z += (dir.z / len) * dt * 4;
          clamp(hero);
        }
        enemies = enemies.filter((e) => e.hp > 0);
        if (!props.training) {
          if (!enemies.length && !spawned) {
            addEnemy(0, -6, true);
            spawned = true;
            message = "The Rift Guardian awakens.";
          } else if (!enemies.length && spawned && !finished) {
            finished = true;
            message = "Rift cleared! Choose a new expedition above.";
          }
          for (const e of enemies) {
            const d = distance(e, hero);
            if (e.wind > 0) {
              e.wind -= dt;
              if (e.wind <= 0) {
                if (d < (e.boss ? 3.5 : 1.8) && invulnerable <= 0) {
                  hp = Math.max(
                    0,
                    hp - Math.max(2, (e.boss ? 30 : 12) * tier - st.defence),
                  );
                  if (!hp)
                    message =
                      "You fell. Restart the expedition; earned progression is kept.";
                }
                e.timer = e.boss ? 2.3 : 1.5;
              }
            } else if (d > (e.boss ? 2.5 : 1.3)) {
              e.x += ((hero.x - e.x) / d) * dt * (e.boss ? 1.2 : 1.7);
              e.z += ((hero.z - e.z) / d) * dt * (e.boss ? 1.2 : 1.7);
            } else {
              e.timer -= dt;
              if (e.timer <= 0) e.wind = e.boss ? 0.9 : 0.45;
            }
          }
        }
        if (elapsed - lastHit > 1.6) combo = 0;
      } else if (current.command) commandId = current.command.id;
      for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].life -= dt;
        if (effects[i].life <= 0) effects.splice(i, 1);
      }
      draw();
      ui += dt;
      if (ui > 0.1) {
        ui = 0;
        const nearest = [...enemies].sort(
          (a, b) => distance(a, hero) - distance(b, hero),
        )[0];
        current.onHUD?.({
          hp,
          mana,
          enemy: nearest
            ? props.training
              ? "Training dummy"
              : nearest.boss
                ? "Rift Guardian"
                : "Ruined sentinel"
            : "Area clear",
          enemyHP: Math.max(0, nearest?.hp ?? 0),
          enemyMax: nearest?.max ?? 1,
          combo,
          cool: [...cool],
          message,
        });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", pointer);
      images.clear();
    };
    // A new expedition resets transient combat state; other props use latest.
  }, [props.studio, props.run, props.training]);
  if (props.studio)
    return (
      <div className="ae-world ae-world-2d">
        <div
          className="ae-illustration"
          style={{ transform: `scale(${props.zoom ?? 1})` }}
        >
          <Character2D look={props.look} />
        </div>
        <div className="ae-stage-floor" />
      </div>
    );
  return (
    <div className="ae-world">
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label="2D isometric arena. Click to move; WASD or arrows, 1 to 4 abilities, Space to dodge."
      />
    </div>
  );
}
