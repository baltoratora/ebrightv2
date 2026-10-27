"use client";
import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { avatar, disposeScene } from "./avatar";
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
  rotation?: number;
  save: Save;
  paused?: boolean;
  tier?: number;
  run?: number;
  training?: boolean;
  command?: WorldCommand;
  onReward?: (boss: boolean) => void;
  onHUD?: (h: WorldHUD) => void;
};
export default function World(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState("");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setError(
        "3D requires WebGL. Please enable hardware acceleration and reload.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x080e19);
    el.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      props.studio
        ? "3D outfit preview"
        : "3D arena. WASD or arrows to move, 1 to 4 for abilities, Space to dodge.",
    );
    const scene = new T.Scene();
    scene.fog = new T.FogExp2(0x080e19, 0.025);
    const camera = new T.OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
    scene.add(new T.HemisphereLight(0xadcfff, 0x243026, 2));
    const light = new T.DirectionalLight(0xffdfb2, 3);
    light.position.set(5, 12, 7);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -15;
    light.shadow.camera.right = 15;
    light.shadow.camera.top = 15;
    light.shadow.camera.bottom = -15;
    scene.add(light);
    const rim = new T.PointLight(0x5ed5ff, 50, 20);
    rim.position.set(-4, 5, -3);
    scene.add(rim);
    const floor = new T.Mesh(
      new T.CylinderGeometry(
        props.studio ? 2.1 : 12,
        props.studio ? 2.3 : 12.5,
        0.35,
        props.studio ? 64 : 10,
      ),
      new T.MeshStandardMaterial({
        color: props.studio ? 0x20253a : 0x243c3d,
        roughness: 0.8,
        metalness: 0.25,
      }),
    );
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);
    const ring = new T.Mesh(
      new T.TorusGeometry(props.studio ? 1.95 : 11.7, 0.025, 6, 100),
      new T.MeshBasicMaterial({ color: 0x67dddd }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);
    if (!props.studio) {
      const tiles = new T.GridHelper(22, 22, 0x486567, 0x2e4848);
      tiles.position.y = 0.005;
      scene.add(tiles);
      for (let i = 0; i < 14; i++) {
        const angle = (i * Math.PI) / 7;
        const g = new T.Group();
        g.position.set(Math.cos(angle) * 10.8, 0, Math.sin(angle) * 10.8);
        const stone = new T.Mesh(
          new T.CylinderGeometry(0.32, 0.5, 1.5 + (i % 3) * 0.4, 5),
          new T.MeshStandardMaterial({ color: 0x425259 }),
        );
        stone.position.y = 0.8;
        stone.castShadow = true;
        g.add(stone);
        const gem = new T.Mesh(
          new T.OctahedronGeometry(0.24),
          new T.MeshStandardMaterial({
            color: 0x76dddd,
            emissive: 0x38aaaa,
            emissiveIntensity: 1,
          }),
        );
        gem.position.y = 2.1;
        g.add(gem);
        scene.add(g);
      }
    }
    let hero = avatar(latest.current.look);
    scene.add(hero);
    let lookKey = JSON.stringify(latest.current.look);
    let target: T.Vector3 | null = null;
    const keys = new Set<string>();
    const effects: { mesh: T.Mesh; life: number }[] = [];
    type Enemy = {
      mesh: T.Group;
      hp: number;
      max: number;
      boss: boolean;
      timer: number;
      wind: number;
    };
    let enemies: Enemy[] = [];
    let spawned = false;
    let finished = false;
    let hp = stats(latest.current.save).hp,
      mana = stats(latest.current.save).mana;
    let combo = 0,
      lastHit = -10,
      elapsed = 0,
      invulnerable = 0,
      animation = 0;
    const cool = [0, 0, 0, 0, 0];
    let message = props.studio
      ? ""
      : props.training
        ? "Training dummy — no rewards"
        : "Defeat the sentinels to summon the guardian.";
    let seenCommand = latest.current.command?.id ?? 0;
    const addEnemy = (x: number, z: number, boss: boolean) => {
      const mesh = avatar({
        ...latest.current.look,
        color: boss ? "#782c4c" : "#414d56",
        trim: boss ? "#ff877d" : "#f4c879",
        skin: "#758a89",
        hair: "#1b2229",
        hairstyle: "crest",
        wings: boss,
        weapon: "blades",
      });
      mesh.position.set(x, 0, z);
      mesh.scale.setScalar(boss ? 1.7 : 0.85);
      scene.add(mesh);
      const max = (boss ? 250 : 65) * (latest.current.tier ?? 1);
      enemies.push({ mesh, hp: max, max, boss, timer: 1, wind: 0 });
    };
    if (!props.studio) {
      if (props.training) addEnemy(0, -3, false);
      else
        for (let i = 0; i < 5; i++)
          addEnemy(Math.cos(i * 1.25) * 6, Math.sin(i * 1.25) * 6, false);
    }
    const burst = (pos: T.Vector3, color: number, size: number) => {
      const mesh = new T.Mesh(
        new T.TorusGeometry(size, 0.06, 6, 48),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.copy(pos);
      mesh.position.y = 0.25;
      scene.add(mesh);
      effects.push({ mesh, life: 0.5 });
    };
    const action = (a: number) => {
      if (
        props.studio ||
        latest.current.paused ||
        hp <= 0 ||
        a < 0 ||
        a > 4 ||
        cool[a] > 0
      )
        return;
      const s = stats(latest.current.save);
      if (a === 3) {
        hp = Math.min(
          s.hp,
          hp + s.hp * (0.4 + latest.current.save.nodes[5] * 0.1),
        );
        cool[3] = 12;
        message = "Healing draught";
        return;
      }
      if (a === 4) {
        invulnerable = 0.65;
        cool[4] = 2.5;
        const d = target
          ? target.clone().sub(hero.position)
          : new T.Vector3(
              Math.sin(hero.rotation.y),
              0,
              Math.cos(hero.rotation.y),
            );
        d.normalize();
        hero.position.addScaledVector(d, 2.5);
        if (hero.position.length() > 9.5) hero.position.setLength(9.5);
        burst(hero.position, 0x99eeff, 0.6);
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
        .sort(
          (a, b) =>
            a.mesh.position.distanceTo(hero.position) -
            b.mesh.position.distanceTo(hero.position),
        );
      const targets =
        a === 2
          ? sorted.filter(
              (e) => e.mesh.position.distanceTo(hero.position) <= range,
            )
          : sorted
              .slice(0, 1)
              .filter(
                (e) => e.mesh.position.distanceTo(hero.position) <= range,
              );
      if (!targets.length) {
        message = "Move closer to a target";
        return;
      }
      mana -= need;
      cool[a] = [0.48, 2.5, 6][a];
      combo = elapsed - lastHit < 1.6 ? Math.min(10, combo + 1) : 1;
      lastHit = elapsed;
      animation = 0.35;
      hero.rotation.y = Math.atan2(
        targets[0].mesh.position.x - hero.position.x,
        targets[0].mesh.position.z - hero.position.z,
      );
      let total = 0;
      for (const e of targets) {
        const crit = Math.random() < s.crit;
        const damage = Math.round(
          s.attack *
            [
              1,
              1.8 * (1 + latest.current.save.nodes[8] * 0.1),
              2.2 * (1 + latest.current.save.nodes[2] * 0.15),
            ][a] *
            (crit ? 1.75 : 1) *
            (1 + combo * 0.025),
        );
        e.hp -= damage;
        total += damage;
        burst(e.mesh.position, crit ? 0xffcc66 : 0x70ecff, 0.6);
        if (e.hp <= 0 && !props.training) {
          latest.current.onReward?.(e.boss);
          scene.remove(e.mesh);
          disposeScene(e.mesh);
        }
        if (props.training) e.hp = e.max;
      }
      if (a === 2) burst(hero.position, 0xbb99ff, range);
      message = `${["Strike", "Pulse", "Nova"][a]} · ${total} damage${combo > 1 ? " · " + combo + " combo" : ""}`;
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName !== "CANVAS") return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      keys.add(e.key.toLowerCase());
      if (!e.repeat) {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) action(n - 1);
        if (e.key === " ") action(4);
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    const ray = new T.Raycaster();
    const plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    const pointer = (e: PointerEvent) => {
      renderer.domElement.focus();
      if (props.studio) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const p = new T.Vector3();
      if (ray.ray.intersectPlane(plane, p)) {
        if (p.length() > 9) p.setLength(9);
        target = p;
      }
    };
    renderer.domElement.addEventListener("pointerdown", pointer);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      const scale = props.studio ? 2.8 : 10;
      camera.left = (-scale * w) / h;
      camera.right = (scale * w) / h;
      camera.top = scale;
      camera.bottom = -scale;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let last = performance.now(),
      frame = 0,
      uiTime = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const current = latest.current;
      const newKey = JSON.stringify(current.look);
      if (newKey !== lookKey) {
        const pos = hero.position.clone(),
          rot = hero.rotation.y;
        scene.remove(hero);
        disposeScene(hero);
        hero = avatar(current.look);
        hero.position.copy(pos);
        hero.rotation.y = rot;
        scene.add(hero);
        lookKey = newKey;
      }
      if (props.studio) {
        hero.rotation.y = current.rotation ?? 0;
        hero.position.y = Math.sin(now * 0.001) * 0.025;
        camera.position.set(4, 3.1, 7);
        camera.lookAt(0, 1.1, 0);
      } else {
        camera.position.copy(hero.position).add(new T.Vector3(11, 14, 11));
        camera.lookAt(hero.position.x, 0, hero.position.z);
        if (!current.paused && !document.hidden && hp > 0) {
          elapsed += dt;
          cool.forEach((v, i) => (cool[i] = Math.max(0, v - dt)));
          invulnerable = Math.max(0, invulnerable - dt);
          animation = Math.max(0, animation - dt);
          const st = stats(current.save);
          hp = Math.min(hp, st.hp);
          mana = Math.min(st.mana, mana + st.regen * dt);
          if (current.command && current.command.id !== seenCommand) {
            seenCommand = current.command.id;
            action(current.command.action);
          }
          const dx =
              (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
              (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
            dz =
              (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
              (keys.has("w") || keys.has("arrowup") ? 1 : 0);
          let dir = new T.Vector3(dx + dz, 0, dz - dx);
          if (dir.length()) {
            target = null;
          } else if (target) {
            dir = target.clone().sub(hero.position);
            if (dir.length() < 0.15) {
              target = null;
              dir.set(0, 0, 0);
            }
          }
          const moving = dir.length() > 0.1;
          if (moving) {
            dir.normalize();
            hero.position.addScaledVector(dir, dt * 4);
            if (hero.position.length() > 9.5) hero.position.setLength(9.5);
            hero.rotation.y = Math.atan2(dir.x, dir.z);
          }
          hero.position.y = moving
            ? Math.abs(Math.sin(elapsed * 12)) * 0.08
            : 0;
          const arms = hero.userData.arms as T.Group[];
          arms.forEach(
            (arm, i) =>
              (arm.rotation.x =
                animation > 0
                  ? -1.4
                  : moving
                    ? Math.sin(elapsed * 10 + i * Math.PI) * 0.45
                    : 0),
          );
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
              const d = e.mesh.position.distanceTo(hero.position);
              e.mesh.lookAt(hero.position.x, 0, hero.position.z);
              if (e.wind > 0) {
                e.wind -= dt;
                if (e.wind <= 0) {
                  if (d < (e.boss ? 3.5 : 1.8) && invulnerable <= 0) {
                    hp = Math.max(
                      0,
                      hp -
                        Math.max(
                          2,
                          (e.boss ? 30 : 12) * (current.tier ?? 1) - st.defence,
                        ),
                    );
                    if (hp === 0)
                      message =
                        "You fell. Restart the expedition; earned upgrades are kept.";
                  }
                  e.timer = e.boss ? 2.3 : 1.5;
                }
              } else if (d > (e.boss ? 2.5 : 1.3)) {
                const toward = hero.position
                  .clone()
                  .sub(e.mesh.position)
                  .normalize();
                e.mesh.position.addScaledVector(
                  toward,
                  dt * (e.boss ? 1.2 : 1.7),
                );
              } else {
                e.timer -= dt;
                if (e.timer <= 0) {
                  e.wind = e.boss ? 0.9 : 0.45;
                  burst(e.mesh.position, 0xff665e, e.boss ? 3.5 : 1.8);
                }
              }
            }
          }
          if (elapsed - lastHit > 1.6) combo = 0;
        } else if (current.command) seenCommand = current.command.id;
        uiTime += dt;
        if (uiTime > 0.1) {
          uiTime = 0;
          const nearest = [...enemies].sort(
            (a, b) =>
              a.mesh.position.distanceTo(hero.position) -
              b.mesh.position.distanceTo(hero.position),
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
      }
      for (let i = effects.length - 1; i >= 0; i--) {
        const fx = effects[i];
        fx.life -= dt;
        fx.mesh.scale.multiplyScalar(1 + dt * 2);
        (fx.mesh.material as T.MeshBasicMaterial).opacity = Math.max(
          0,
          fx.life * 2,
        );
        if (fx.life <= 0) {
          scene.remove(fx.mesh);
          disposeScene(fx.mesh);
          effects.splice(i, 1);
        }
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);
    const lost = (e: Event) => {
      e.preventDefault();
      setError(
        "The 3D context was lost. Reload to resume from your saved progression.",
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      renderer.domElement.removeEventListener("pointerdown", pointer);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Scene resets only for a new expedition; current props flow through latest.
  }, [props.studio, props.run, props.training]);
  return (
    <div className="ae-world" ref={host}>
      {error && (
        <p className="ae-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
