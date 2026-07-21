import { describe, expect, it } from "vitest";

import { normalizeChallengeHandle } from "./challenge";

describe("normalizeChallengeHandle", () => {
  it("normalizes a valid X handle", () => {
    expect(normalizeChallengeHandle(" @StewartLi666 ")).toBe("stewartli666");
  });

  it("uses the first search param value and rejects unsafe input", () => {
    expect(normalizeChallengeHandle(["Alice", "Bob"])).toBe("alice");
    expect(normalizeChallengeHandle("../../dashboard")).toBeNull();
    expect(normalizeChallengeHandle("name-with-dash")).toBeNull();
    expect(normalizeChallengeHandle("a".repeat(16))).toBeNull();
  });
});
