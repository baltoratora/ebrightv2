import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { faceMaterial } from "./face-material";
import { prepareLitGeometry } from "./material-geometry";
import { Look } from "@/lib/aether";
import { avatar as lowPolyAvatar } from "./low-poly-avatar";

let template: Promise<T.Group> | undefined;
function loadTemplate() {
  if (!template) {
    template = new GLTFLoader()
      .loadAsync("/aether/shino-base.glb")
      .then((g) => g.scene)
      .catch((error) => {
        template = undefined;
        throw error;
      });
  }
  return template;
}

/** The CC0 VRoid base supplies the face, topology and skeleton. Fantasy accessories are original. */
export function avatar(look: Look) {
  const root = new T.Group();
  root.userData.arms = [];
  root.userData.ready = false;
  root.userData.disposed = false;
  const ready = loadTemplate()
    .then((source) => {
      if (root.userData.disposed) return;
      const model = clone(source) as T.Group;
      const textures = new Map<T.Texture, T.Texture>();
      const materials = new Map<T.Material, T.Material>();
      const geometries = new Map<T.BufferGeometry, T.BufferGeometry>();
      model.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        if (!geometries.has(object.geometry)) {
          const geometry = object.geometry.clone();
          prepareLitGeometry(geometry);
          geometries.set(object.geometry, geometry);
        }
        object.geometry = geometries.get(object.geometry)!;
        const convert = (old: T.MeshStandardMaterial) => {
          if (materials.has(old)) return materials.get(old)!;
          let map = old.map;
          if (map) {
            if (!textures.has(map)) textures.set(map, map.clone());
            map = textures.get(map)!;
          }
          const name = old.name;
          let color: T.ColorRepresentation = old.color;
          if (/HAIR|FaceBrow/.test(name)) color = look.hair;
          else if (/Tops|Bottoms/.test(name)) color = look.color;
          else if (/AccessoryNeck|EyeIris/.test(name)) color = look.trim;
          else if (/Shoes/.test(name)) color = "#29313f";
          else if (/SKIN/.test(name))
            color = new T.Color(look.skin).lerp(new T.Color("#ffffff"), 0.48);
          const material =
            faceMaterial(old, map, look) ??
            new T.MeshToonMaterial({
              name,
              color,
              map,
              side: T.DoubleSide,
              transparent: old.transparent,
              opacity: old.opacity,
              alphaTest: old.alphaTest,
              depthWrite: !old.transparent,
            });
          materials.set(old, material);
          return material;
        };
        object.material = Array.isArray(object.material)
          ? object.material.map((m) => convert(m as T.MeshStandardMaterial))
          : convert(object.material as T.MeshStandardMaterial);
        object.castShadow = true;
        object.receiveShadow = false;
        object.frustumCulled = false;
        // Hair geometry remains skinned. Compress long strands below the jaw for the bob / swept styles.
        const name = Array.isArray(object.material)
          ? object.material.map((m) => m.name).join(" ")
          : object.material.name;
        if (/HAIR/.test(name) && look.hairstyle !== "long") {
          const p = object.geometry.getAttribute("position");
          for (let i = 0; i < p.count; i++) {
            const y = p.getY(i);
            if (y < 1.43)
              p.setY(
                i,
                (() => {
                  const t = T.MathUtils.smoothstep(y, 1.15, 1.43);
                  const scale = look.hairstyle === "short" ? 0.45 : 0.7;
                  return y + (1.43 - y) * (1 - scale) * (1 - t);
                })(),
              );
          }
          p.needsUpdate = true;
          object.geometry.computeVertexNormals();
        }
      });
      const armL = model.getObjectByName("J_Bip_L_UpperArm");
      const armR = model.getObjectByName("J_Bip_R_UpperArm");
      if (armL) armL.rotation.z = 1.22;
      if (armR) armR.rotation.z = -1.22;
      const head = model.getObjectByName("J_Bip_C_Head");
      if (head) head.rotation.z = 0.035;
      // VRM 0.x faces -Z. Normalise the game-facing orientation and overall height.
      model.rotation.y = Math.PI;
      model.scale.setScalar(1.5);
      root.add(model);
      root.userData.arms = [armL, armR].filter(Boolean);
      root.userData.head = head;
      root.userData.legs = [
        model.getObjectByName("J_Bip_L_UpperLeg"),
        model.getObjectByName("J_Bip_R_UpperLeg"),
      ].filter(Boolean);
      root.userData.baseArmZ = [1.22, -1.22];
      addWardrobe(model, look);
      root.userData.ready = true;
    })
    .catch(() => {
      if (root.userData.disposed) return;
      const fallback = lowPolyAvatar(look);
      root.add(fallback);
      root.userData.arms = fallback.userData.arms;
      root.userData.loadError =
        "Anime model could not load. Showing the lightweight character; reload to retry.";
      root.userData.ready = true;
    });
  root.userData.loading = ready;
  return root;
}

function addWardrobe(model: T.Group, look: Look) {
  const cloth = new T.MeshToonMaterial({
    color: look.color,
    side: T.DoubleSide,
  });
  const lining = new T.MeshToonMaterial({
    color: "#eee4ce",
    side: T.DoubleSide,
  });
  const leather = new T.MeshToonMaterial({ color: "#443143" });
  const gold = new T.MeshToonMaterial({ color: "#cfae76" });
  const glow = new T.MeshToonMaterial({
    color: look.trim,
    emissive: look.trim,
    emissiveIntensity: 0.2,
  });
  function mesh(
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = model,
  ) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  }
  function ribbon(
    points: T.Vector3[],
    radius: number,
    m: T.Material,
    parent: T.Object3D = model,
  ) {
    return mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, radius, 6, false),
      m,
      0,
      0,
      0,
      parent,
    );
  }
  const chest =
    model.getObjectByName("J_Bip_C_UpperChest") ??
    model.getObjectByName("J_Bip_C_Chest") ??
    model;
  if (look.style === "robe") {
    // Open-front cape, with an ivory hem; the original fully clothed base stays underneath.
    const points = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      points.push(new T.Vector2(0.15 + t * 0.26, 1.32 - t * 0.85));
    }
    const cape = mesh(
      new T.LatheGeometry(points, 32, -Math.PI * 0.52, Math.PI * 1.04),
      cloth,
      0,
      0,
      0.06,
    );
    cape.scale.z = 0.75;
    const hem = [];
    for (let i = 0; i <= 30; i++) {
      const a = -Math.PI * 0.52 + (i / 30) * Math.PI * 1.04;
      hem.push(
        new T.Vector3(0.41 * Math.sin(a), 0.47, 0.06 + 0.3075 * Math.cos(a)),
      );
    }
    ribbon(hem, 0.012, gold);
    const collar = mesh(
      new T.TorusGeometry(0.115, 0.035, 8, 32),
      lining,
      0,
      0.07,
      0,
      chest,
    );
    collar.rotation.x = Math.PI / 2;
    collar.scale.x = 1.35;
  } else if (look.style === "plate") {
    const breast = mesh(
      new T.SphereGeometry(1, 20, 16),
      cloth,
      0,
      -0.04,
      -0.055,
      chest,
    );
    breast.scale.set(0.145, 0.13, 0.075);
    for (const side of [-1, 1]) {
      const arm = model.getObjectByName(
        side < 0 ? "J_Bip_L_UpperArm" : "J_Bip_R_UpperArm",
      );
      if (arm) {
        const pauldron = mesh(
          new T.SphereGeometry(1, 16, 12),
          lining,
          side * 0.025,
          0,
          0,
          arm,
        );
        pauldron.scale.set(0.08, 0.07, 0.085);
        const band = mesh(
          new T.TorusGeometry(0.07, 0.009, 6, 24),
          gold,
          side * 0.04,
          0,
          0,
          arm,
        );
        band.rotation.y = Math.PI / 2;
      }
    }
  } else {
    const strap = mesh(
      new T.BoxGeometry(0.035, 0.3, 0.018),
      leather,
      0,
      -0.07,
      -0.105,
      chest,
    );
    strap.rotation.z = -0.4;
    mesh(new T.BoxGeometry(0.12, 0.12, 0.075), leather, 0.16, 0.84, -0.08);
    mesh(new T.BoxGeometry(0.035, 0.045, 0.01), gold, 0.16, 0.85, -0.123);
  }
  const clasp = mesh(
    new T.OctahedronGeometry(0.027),
    glow,
    0,
    0.015,
    -0.105,
    chest,
  );
  clasp.scale.y = 1.3;
  const belt = mesh(
    new T.CylinderGeometry(0.112, 0.115, 0.034, 32),
    leather,
    0,
    0.96,
    0,
  );
  belt.scale.z = 0.75;
  mesh(new T.BoxGeometry(0.045, 0.038, 0.018), gold, 0, 0.96, -0.087);
  if (look.hairstyle === "crest") {
    const head = model.getObjectByName("J_Bip_C_Head");
    if (head) {
      const arc = [];
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI;
        arc.push(
          new T.Vector3(
            Math.cos(a) * 0.095,
            0.065 + Math.sin(a) * 0.105,
            -0.015,
          ),
        );
      }
      ribbon(arc, 0.008, gold, head);
      mesh(new T.OctahedronGeometry(0.024), glow, 0, 0.18, -0.018, head);
    }
  }
  const equip = (left: boolean) => {
    const hand = model.getObjectByName(left ? "J_Bip_L_Hand" : "J_Bip_R_Hand");
    if (!hand) return;
    const g = new T.Group();
    hand.add(g);
    g.rotation.z = left ? -1.22 : 1.22;
    if (look.weapon === "staff") {
      mesh(
        new T.CylinderGeometry(0.015, 0.021, 1.1, 12),
        leather,
        0,
        0.12,
        0,
        g,
      );
      mesh(new T.TorusGeometry(0.11, 0.012, 8, 32), gold, 0, 0.72, 0, g);
      mesh(new T.OctahedronGeometry(0.07), glow, 0, 0.72, 0, g);
    } else {
      mesh(new T.CylinderGeometry(0.018, 0.018, 0.12, 8), leather, 0, 0, 0, g);
      mesh(new T.BoxGeometry(0.18, 0.025, 0.035), gold, 0, 0.075, 0, g);
      const blade = mesh(
        new T.ConeGeometry(0.045, look.weapon === "blades" ? 0.4 : 0.6, 4),
        lining,
        0,
        look.weapon === "blades" ? 0.29 : 0.39,
        0,
        g,
      );
      blade.scale.z = 0.3;
      mesh(new T.OctahedronGeometry(0.025), glow, 0, 0.075, -0.025, g);
    }
  };
  equip(false);
  if (look.weapon === "blades") equip(true);
  if (look.wings)
    for (const sign of [-1, 1])
      for (let i = 0; i < 6; i++) {
        const feather = mesh(
          new T.SphereGeometry(1, 12, 8),
          i % 2 ? lining : glow,
          sign * (0.16 + i * 0.045),
          1.22 - i * 0.045,
          0.12 + i * 0.018,
        );
        feather.scale.set(0.035, 0.22 - i * 0.015, 0.014);
        feather.rotation.z = -sign * (0.6 + i * 0.13);
      }
}

export function disposeScene(root: T.Object3D) {
  root.userData.disposed = true;
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>(),
    skeletons = new Set<T.Skeleton>();
  root.traverse((o) => {
    o.userData.disposed = true;
    if (o instanceof T.SkinnedMesh) skeletons.add(o.skeleton);
    if (o instanceof T.Mesh) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const v of Object.values(m))
          if (v instanceof T.Texture) textures.add(v);
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  skeletons.forEach((s) => s.dispose());
}
