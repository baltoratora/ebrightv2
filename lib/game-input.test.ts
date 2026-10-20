import { afterEach, describe, expect, it, vi } from "vitest";
import { ignoreGameKey } from "./game-input";

// A minimal Element stand-in keeps this pure keyboard-routing test DOM-free.
class Target { constructor(private match: string | null = null) {} closest(selector: string) { return this.match && selector.includes(this.match) ? this : null; } }
afterEach(() => vi.unstubAllGlobals());
describe("game shortcuts", () => {
  it("leaves typing, composition, browser shortcuts and native activations alone", () => {
    vi.stubGlobal("Element", Target);
    const key = (target: Target, extra = {}) => ({ target, key: "a", ...extra }) as unknown as KeyboardEvent;
    expect(ignoreGameKey(key(new Target("input")))).toBe(true);
    expect(ignoreGameKey(key(new Target("select")))).toBe(true);
    expect(ignoreGameKey(key(new Target("nav")))).toBe(true);
    expect(ignoreGameKey(key(new Target("button"), { key: "Enter" }))).toBe(true);
    expect(ignoreGameKey(key(new Target(), { ctrlKey: true }))).toBe(true);
    expect(ignoreGameKey(key(new Target(), { isComposing: true }))).toBe(true);
    expect(ignoreGameKey(key(new Target(), { key: "ArrowLeft" }))).toBe(false);
  });
});
