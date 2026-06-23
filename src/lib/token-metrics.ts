import type { TokenUsageEntry, ToolKey } from "./types";

const INPUT_INCLUDES_CACHE_TOOLS = new Set<ToolKey>(["codex"]);

type TokenMetricEntry = Pick<
  TokenUsageEntry,
  "tool" | "input" | "output" | "cacheRead" | "cacheWrite" | "total"
>;

export function inputIncludesCacheRead(tool: ToolKey): boolean {
  return INPUT_INCLUDES_CACHE_TOOLS.has(tool);
}

export function canonicalTotalTokens(entry: TokenMetricEntry): number {
  if (inputIncludesCacheRead(entry.tool)) {
    return entry.input + entry.output;
  }

  return entry.input + entry.output + entry.cacheRead + entry.cacheWrite;
}

export function legacySummedTotalTokens(entry: TokenMetricEntry): number {
  return entry.input + entry.output + entry.cacheRead + entry.cacheWrite;
}

export function hasAcceptedTotalTokens(entry: TokenMetricEntry): boolean {
  const canonicalTotal = canonicalTotalTokens(entry);
  return entry.total === canonicalTotal || entry.total === legacySummedTotalTokens(entry);
}

export function fullPriceInputTokens(entry: TokenMetricEntry): number {
  if (!inputIncludesCacheRead(entry.tool)) {
    return entry.input;
  }

  return Math.max(0, entry.input - entry.cacheRead);
}
