import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "./save";
import { initialState } from "../sim/state";

describe("save", () => {
  it("round-trips a state exactly", () => {
    const s = initialState({ mode: "dominate", rngSeed: 3 });
    expect(deserialize(serialize(s)).state).toEqual(s);
  });
  it("fails safe on corruption without zeroing (keeps raw backup)", () => {
    const r = deserialize("{not valid json");
    expect(r.state).toBeNull();
    expect(r.error).toBe("corrupt");
    expect(r.rawBackup).toBe("{not valid json");
  });
  it("flags a version mismatch instead of crashing", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    const bumped = JSON.parse(serialize(s));
    bumped.schemaVersion = 999;
    expect(deserialize(JSON.stringify(bumped)).error).toBe("version");
  });
  it("rejects invalid runtime values (negative population, bad occ)", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    const bad = JSON.parse(serialize(s));
    bad.regions.nursery.P = -5;
    const r = deserialize(JSON.stringify(bad));
    expect(r.state).toBeNull();
    expect(r.error).toBe("invalid");
    expect(r.rawBackup).toBeTruthy();
  });
  it("rejects a mutation decision with no options", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    const bad = JSON.parse(serialize(s));
    bad.pendingDecision = { kind: "mutation", id: "m", options: [], context: "", requiresResume: true };
    expect(deserialize(JSON.stringify(bad)).error).toBe("invalid");
  });
  it("persists pendingDecision + claimedGrants so resume cannot reroll or double-grant", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    s.pendingDecision = { kind: "mutation", options: ["armor", "thermal", "hypoxia"], id: "m", context: "x", requiresResume: true };
    s.schedule.claimedGrants = ["survive:hirnantian"];
    const back = deserialize(serialize(s)).state!;
    expect(back.pendingDecision!.options).toEqual(["armor", "thermal", "hypoxia"]);
    expect(back.schedule.claimedGrants).toEqual(["survive:hirnantian"]);
  });
});
