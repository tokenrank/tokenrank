import { describe, expect, it } from "vitest";
import { canonicalTotalTokens, fullPriceInputTokens, legacySummedTotalTokens } from "./token-metrics";
import type { TokenUsageEntry } from "./types";

function entry(overrides: Partial<TokenUsageEntry> = {}): TokenUsageEntry {
  return {
    date: "2026-07-01",
    tool: "claude-code",
    model: "fixture-model",
    input: 1_000,
    output: 200,
    cacheRead: 800,
    cacheWrite: 50,
    total: 1_200,
    ...overrides,
  };
}

describe("token metrics", () => {
  it("uses raw summed totals for tools whose input excludes cache reads", () => {
    const usage = entry({ tool: "claude-code" });

    expect(fullPriceInputTokens(usage)).toBe(1_000);
    expect(canonicalTotalTokens(usage)).toBe(2_050);
    expect(legacySummedTotalTokens(usage)).toBe(2_050);
  });

  it("uses provider raw input plus output for Codex rows", () => {
    const usage = entry({
      tool: "codex",
      input: 1_000,
      output: 200,
      cacheRead: 800,
      cacheWrite: 0,
      total: 1_200,
    });

    expect(fullPriceInputTokens(usage)).toBe(200);
    expect(canonicalTotalTokens(usage)).toBe(1_200);
    expect(legacySummedTotalTokens(usage)).toBe(2_000);
  });
});
