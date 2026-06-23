import type { TokenUsageEntry } from "./types";
import { fullPriceInputTokens } from "./token-metrics";

type Price = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
  cacheWritePerMillion: number;
};

const FALLBACK_PRICE: Price = {
  inputPerMillion: 2,
  outputPerMillion: 8,
  cacheReadPerMillion: 0.2,
  cacheWritePerMillion: 2,
};

const MODEL_PRICES: Record<string, Price> = {
  "gpt-5.5": {
    inputPerMillion: 2,
    outputPerMillion: 10,
    cacheReadPerMillion: 0.25,
    cacheWritePerMillion: 2,
  },
  "claude-opus-4-8": {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheReadPerMillion: 1.5,
    cacheWritePerMillion: 18.75,
  },
  unknown: FALLBACK_PRICE,
};

export function estimateCostMicros(entry: TokenUsageEntry): number {
  const price = MODEL_PRICES[entry.model] ?? FALLBACK_PRICE;
  const input = fullPriceInputTokens(entry);
  const usd =
    (input / 1_000_000) * price.inputPerMillion +
    (entry.output / 1_000_000) * price.outputPerMillion +
    (entry.cacheRead / 1_000_000) * price.cacheReadPerMillion +
    (entry.cacheWrite / 1_000_000) * price.cacheWritePerMillion;

  return Math.round(usd * 1_000_000);
}
