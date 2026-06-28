import { describe, it, expect } from "vitest";
import { pool8Result } from "./pool";

describe("pool8Result", () => {
  it("wins when all solids are cleared and there is no scratch", () => {
    expect(pool8Result(0, false)).toBe("won");
  });
  it("loses on a scratch even when all solids are cleared (scratch on the 8 = loss)", () => {
    expect(pool8Result(0, true)).toBe("lost");
  });
  it("loses when the 8-ball is potted early (solids still on the table)", () => {
    expect(pool8Result(3, false)).toBe("lost");
    expect(pool8Result(3, true)).toBe("lost");
  });
});
