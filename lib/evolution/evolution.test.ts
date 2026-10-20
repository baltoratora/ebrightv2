import { describe, it, expect } from "vitest";
import { ERAS, getEra, eraDurationMa, REGION_MAP } from "./eras/eras";
import { TRAITS, TRAIT_ORDER } from "./traits/traits";
import { PARTS, ATTACHMENTS, VIEWBOX, type PartId } from "./creatures/parts";
import {
  FORMS,
  FORM_ORDER,
  renderDescriptor,
  defaultDescriptor,
} from "./creatures/lineage";
import { ERA_PALETTES } from "./palette";
import { BODIES, anchorsFor, bodyPath, tailPath } from "./creatures/bodies";

describe("eras", () => {
  it("has the four periods in order, no skip", () => {
    expect(ERAS.map((e) => e.id)).toEqual(["cambrian", "ordovician", "silurian", "devonian"]);
  });

  it("uses the ICS v2024/12 boundary ages", () => {
    const byId = Object.fromEntries(ERAS.map((e) => [e.id, e]));
    expect([byId.cambrian.baseMa, byId.cambrian.topMa]).toEqual([538.8, 486.85]);
    expect([byId.ordovician.baseMa, byId.ordovician.topMa]).toEqual([486.85, 443.1]);
    expect([byId.silurian.baseMa, byId.silurian.topMa]).toEqual([443.1, 419.62]);
    expect([byId.devonian.baseMa, byId.devonian.topMa]).toEqual([419.62, 358.86]);
  });

  it("boundaries are contiguous and monotonically younger", () => {
    for (const e of ERAS) expect(e.baseMa).toBeGreaterThan(e.topMa);
    for (let i = 1; i < ERAS.length; i++) {
      expect(ERAS[i].baseMa).toBe(ERAS[i - 1].topMa); // contiguous, no skipped interval
    }
  });

  it("marks only the Late Ordovician and Late Devonian boundaries as mass extinctions", () => {
    const byId = Object.fromEntries(ERAS.map((e) => [e.id, e]));
    expect(byId.cambrian.transitionOut.type).toBe("ordinary");
    expect(byId.ordovician.transitionOut.type).toBe("mass-extinction");
    expect(byId.silurian.transitionOut.type).toBe("ordinary");
    expect(byId.devonian.transitionOut.type).toBe("mass-extinction");
  });

  it("computes geological duration", () => {
    expect(eraDurationMa(getEra("cambrian"))).toBeCloseTo(51.95, 2);
  });

  it("has an era palette for every era", () => {
    for (const e of ERAS) expect(ERA_PALETTES[e.id]).toBeTruthy();
  });
});

describe("traits ledger", () => {
  it("lists all traits in order", () => {
    expect(TRAIT_ORDER).toEqual(["armor", "jaws", "paired-fins", "lobed-limbs"]);
    for (const id of TRAIT_ORDER) expect(TRAITS[id]).toBeTruthy();
  });

  it("every trait unlocks in a real era and records the ledger", () => {
    const eraIds = new Set(ERAS.map((e) => e.id));
    for (const id of TRAIT_ORDER) {
      const t = TRAITS[id];
      expect(eraIds.has(t.unlockPeriod)).toBe(true);
      expect(t.earliestEvidence.length).toBeGreaterThan(0);
      expect(t.diversification.length).toBeGreaterThan(0);
      // No trait unlocks before its earliest evidence, so none are flagged.
      expect(t.simplification).toBe(false);
    }
  });
});

describe("parts metadata", () => {
  it("every part attaches to a defined attachment point", () => {
    for (const part of Object.values(PARTS)) {
      expect(ATTACHMENTS[part.attachment]).toBeTruthy();
    }
  });

  it("attachment points sit inside the viewBox", () => {
    for (const a of Object.values(ATTACHMENTS)) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(VIEWBOX.w);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(VIEWBOX.h);
    }
  });
});

describe("lineage render resolution", () => {
  it("has the four forms in order with matching era ids", () => {
    expect(FORM_ORDER).toEqual(["cambrian", "ordovician", "silurian", "devonian"]);
    for (const id of FORM_ORDER) expect(FORMS[id]).toBeTruthy();
  });

  it("every default form includes the shared base body, eye and tail", () => {
    for (const id of FORM_ORDER) {
      const ids = defaultDescriptor(id).map((l) => l.partId);
      expect(ids).toContain("body");
      expect(ids).toContain("eye");
      expect(ids).toContain("tail");
    }
  });

  it("is deterministic and independent of trait input order", () => {
    const a = renderDescriptor("silurian", ["jaws", "paired-fins"]);
    const b = renderDescriptor("silurian", ["paired-fins", "jaws"]);
    expect(a).toEqual(b);
    expect(renderDescriptor("cambrian", [])).toEqual(renderDescriptor("cambrian", []));
  });

  it("jaws replace the simple mouth (mutually exclusive)", () => {
    const withJaws = renderDescriptor("cambrian", ["jaws"]).map((l) => l.partId);
    expect(withJaws).toContain("jaws");
    expect(withJaws).not.toContain("mouth-simple");
    const noJaws = renderDescriptor("cambrian", []).map((l) => l.partId);
    expect(noJaws).toContain("mouth-simple");
    expect(noJaws).not.toContain("jaws");
  });

  it("lobed limbs replace paired fins (same flank slot)", () => {
    const both = renderDescriptor("devonian", ["paired-fins", "lobed-limbs"]).map((l) => l.partId);
    expect(both).toContain("limb-fore");
    expect(both).toContain("limb-hind");
    expect(both).not.toContain("fin-pectoral");
    expect(both).not.toContain("fin-pelvic");
  });

  it("adds paired fins when only paired fins are active", () => {
    const parts = renderDescriptor("silurian", ["paired-fins"]).map((l) => l.partId);
    expect(parts).toContain("fin-pectoral");
    expect(parts).toContain("fin-pelvic");
    expect(parts).not.toContain("limb-fore");
  });

  it("returns layers sorted back-to-front", () => {
    const layers = renderDescriptor("devonian", ["armor", "jaws", "lobed-limbs"]);
    const order = layers.map((l) => l.layer);
    expect([...order]).toEqual([...order].sort((x, y) => x - y));
  });

  it("never emits a part id missing from the PARTS registry", () => {
    for (const id of FORM_ORDER) {
      for (const l of renderDescriptor(id, ["armor", "jaws", "paired-fins", "lobed-limbs"])) {
        expect(PARTS[l.partId as PartId]).toBeTruthy();
      }
    }
  });
});

describe("parametric bodies", () => {
  it("defines a body for every form", () => {
    for (const id of FORM_ORDER) expect(BODIES[id]).toBeTruthy();
  });

  it("gives each form a distinct silhouette", () => {
    const heads = FORM_ORDER.map((id) => BODIES[id].headShape);
    const tails = FORM_ORDER.map((id) => BODIES[id].tailStyle);
    // all four head shapes and tail styles are different
    expect(new Set(heads).size).toBe(FORM_ORDER.length);
    expect(new Set(tails).size).toBe(FORM_ORDER.length);
    // bodies differ by full config signature too
    const sigs = FORM_ORDER.map((id) => JSON.stringify(BODIES[id]));
    expect(new Set(sigs).size).toBe(FORM_ORDER.length);
    // lengths and depths actually vary (not all identical)
    expect(new Set(FORM_ORDER.map((id) => BODIES[id].tailBaseX - BODIES[id].snoutX)).size).toBeGreaterThan(1);
    expect(new Set(FORM_ORDER.map((id) => BODIES[id].depth)).size).toBeGreaterThan(1);
  });

  it("resolves attachments within the viewBox for every form", () => {
    for (const id of FORM_ORDER) {
      const a = anchorsFor(BODIES[id]);
      // every part's attachment id is present in the derived anchors
      for (const part of Object.values(PARTS)) {
        expect(a[part.attachment]).toBeTruthy();
      }
      for (const point of Object.values(a)) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(VIEWBOX.w);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(VIEWBOX.h);
      }
    }
  });

  it("produces valid body and tail paths for every form", () => {
    for (const id of FORM_ORDER) {
      const b = BODIES[id];
      expect(bodyPath(b).startsWith("M")).toBe(true);
      expect(tailPath(b).startsWith("M")).toBe(true);
      expect(bodyPath(b)).not.toContain("NaN");
      expect(tailPath(b)).not.toContain("NaN");
    }
  });
});

describe("region map study", () => {
  it("is labelled approximate and has selectable territories", () => {
    expect(REGION_MAP.note.toLowerCase()).toContain("approximate");
    expect(REGION_MAP.regions.some((r) => r.selectable)).toBe(true);
    expect(REGION_MAP.regions.some((r) => r.type === "ocean" && !r.selectable)).toBe(true);
  });

  it("keeps region ellipses within the 0..100 map space", () => {
    for (const r of REGION_MAP.regions) {
      expect(r.cx - r.rx).toBeGreaterThanOrEqual(-5);
      expect(r.cx + r.rx).toBeLessThanOrEqual(105);
      expect(r.cy - r.ry).toBeGreaterThanOrEqual(-5);
      expect(r.cy + r.ry).toBeLessThanOrEqual(105);
    }
  });
});
