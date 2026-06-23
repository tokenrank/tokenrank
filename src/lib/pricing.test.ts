import { describe, expect, it } from "vitest";
import { estimateCostMicros } from "./pricing";
import type { TokenUsageEntry } from "./types";

describe("pricing helpers", () => {
  it("estimates known model costs in micros", () => {
    const entry: TokenUsageEntry = {
      date: "2026-06-23",
      tool: "codex",
      model: "gpt-5.5",
      input: 1_000_000,
      output: 500_000,
      cacheRead: 400_000,
      cacheWrite: 250_000,
      total: 1_500_000,
    };

    expect(estimateCostMicros(entry)).toBe(6_800_000);
  });

  it("does not charge Codex cached input as full-price input twice", () => {
    const entry: TokenUsageEntry = {
      date: "2026-06-23",
      tool: "codex",
      model: "not-priced-yet",
      input: 1_000_000,
      output: 1_000_000,
      cacheRead: 600_000,
      cacheWrite: 100_000,
      total: 2_000_000,
    };

    expect(estimateCostMicros(entry)).toBe(9_120_000);
  });

  it("uses fallback pricing for unknown models", () => {
    const entry: TokenUsageEntry = {
      date: "2026-06-23",
      tool: "qwen",
      model: "not-priced-yet",
      input: 1_000_000,
      output: 1_000_000,
      cacheRead: 1_000_000,
      cacheWrite: 1_000_000,
      total: 4_000_000,
    };

    expect(estimateCostMicros(entry)).toBe(12_200_000);
  });
});
