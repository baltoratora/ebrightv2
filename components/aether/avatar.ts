import * as T from "three";
import { Look } from "@/lib/aether";
export function avatar(look: Look) {
  const root = new T.Group();
  const armor = new T.MeshStandardMaterial({
    color: look.color,
    metalness: 0.65,
    roughness: 0.32,
  });
  const trim = new T.MeshStandardMaterial({
    color: look.trim,
    emissive: look.trim,
    emissiveIntensity: 0.6,
    metalness: 0.4,
    roughness: 0.25,
  });
  const skin = new T.MeshStandardMaterial({ color: look.skin, roughness: 0.8 });
  const hair = new T.MeshStandardMaterial({ color: look.hair, roughness: 0.7 });
  const dark = new T.MeshStandardMaterial({ color: 0x18202c, roughness: 0.6 });
  function part(
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = root,
  ) {
    const p = new T.Mesh(g, m);
    p.position.set(x, y, z);
    p.castShadow = true;
    p.receiveShadow = true;
    parent.add(p);
    return p;
  }
  const sphere = (
    x: number,
    y: number,
    z: number,
    m: T.Material,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const p = part(new T.SphereGeometry(1, 16, 12), m, x, y, z);
    p.scale.set(sx, sy, sz);
    return p;
  };
  for (const x of [-0.23, 0.23]) {
    part(new T.CylinderGeometry(0.16, 0.13, 0.65, 10), dark, x, 0.72, 0);
    part(new T.CylinderGeometry(0.19, 0.14, 0.5, 8), armor, x, 0.28, 0);
    sphere(x, 0.13, 0.12, armor, 0.19, 0.13, 0.3);
    part(new T.BoxGeometry(0.11, 0.4, 0.08), trim, x, 0.37, 0.16);
  }
  const torso = part(
    new T.CylinderGeometry(0.43, 0.28, 0.7, 8),
    armor,
    0,
    1.36,
    0,
  );
  torso.scale.z = 0.66;
  part(new T.CylinderGeometry(0.3, 0.32, 0.15, 10), dark, 0, 0.96, 0);
  part(new T.OctahedronGeometry(0.14), trim, 0, 1.42, 0.3);
  if (look.style === "robe") {
    const skirt = part(
      new T.CylinderGeometry(0.28, 0.61, 0.8, 12),
      armor,
      0,
      0.63,
      0,
    );
    skirt.scale.z = 0.72;
  } else if (look.style === "ranger") {
    part(new T.BoxGeometry(0.12, 0.75, 0.51), dark, 0.17, 1.32, 0).rotation.z =
      0.4;
  }
  const arms: T.Group[] = [];
  for (const x of [-0.53, 0.53]) {
    const a = new T.Group();
    a.position.set(x, 1.55, 0);
    root.add(a);
    arms.push(a);
    const shoulder = part(
      new T.IcosahedronGeometry(look.style === "plate" ? 0.29 : 0.19, 0),
      armor,
      0,
      0,
      0,
      a,
    );
    shoulder.scale.y = 0.7;
    part(new T.CylinderGeometry(0.12, 0.1, 0.65, 10), armor, 0, -0.38, 0, a);
    part(new T.SphereGeometry(0.12, 12, 8), skin, 0, -0.76, 0, a);
    part(
      new T.TorusGeometry(0.14, 0.035, 6, 16),
      trim,
      0,
      -0.5,
      0,
      a,
    ).rotation.x = Math.PI / 2;
  }
  part(new T.CylinderGeometry(0.12, 0.13, 0.16, 12), skin, 0, 1.79, 0);
  sphere(0, 2.02, 0, skin, 0.25, 0.31, 0.23);
  sphere(0, 2.19, -0.025, hair, 0.26, 0.18, 0.24);
  for (const x of [-0.09, 0.09]) {
    sphere(x, 2.04, 0.211, dark, 0.037, 0.025, 0.025);
    sphere(x, 2.045, 0.232, trim, 0.016, 0.015, 0.01);
  }
  sphere(0, 1.98, 0.235, skin, 0.035, 0.055, 0.045);
  if (look.hairstyle === "long") sphere(0, 1.84, -0.18, hair, 0.27, 0.44, 0.13);
  if (look.hairstyle === "crest")
    for (let i = 0; i < 5; i++)
      part(new T.ConeGeometry(0.1, 0.35, 5), hair, 0, 2.38, -0.17 + i * 0.08);
  for (let i = 0; i < 5; i++) {
    const p = part(
      new T.ConeGeometry(0.09, 0.23, 5),
      hair,
      -0.2 + i * 0.1,
      2.13,
      0.16,
    );
    p.rotation.z = 0.5;
    p.rotation.x = Math.PI;
  }
  const weapon = (a: T.Group) => {
    part(new T.CylinderGeometry(0.045, 0.045, 0.32, 8), dark, 0, -0.8, 0.08, a);
    if (look.weapon === "staff") {
      part(
        new T.CylinderGeometry(0.04, 0.05, 1.7, 8),
        armor,
        0,
        -0.65,
        0.08,
        a,
      );
      part(new T.OctahedronGeometry(0.23), trim, 0, 0.3, 0.08, a);
      part(new T.TorusGeometry(0.29, 0.025, 6, 24), trim, 0, 0.3, 0.08, a);
    } else {
      part(new T.BoxGeometry(0.42, 0.07, 0.13), armor, 0, -0.6, 0.08, a);
      part(new T.ConeGeometry(0.16, 1.1, 4), trim, 0, -0.02, 0.08, a);
    }
  };
  weapon(arms[1]);
  if (look.weapon === "blades") weapon(arms[0]);
  if (look.wings)
    for (const sign of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const feather = part(
          new T.ConeGeometry(0.13, 1.1 - i * 0.1, 4),
          trim,
          sign * (0.43 + i * 0.15),
          1.6 - i * 0.12,
          -0.23,
        );
        feather.rotation.z = -sign * (0.65 + i * 0.13);
      }
  root.userData.arms = arms;
  return root;
}
export function disposeScene(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
