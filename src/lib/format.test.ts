import { describe, expect, it } from "vitest";
import { formatTokens, formatUsdMicros } from "./format";

describe("format helpers", () => {
  it("formats token totals with zh-CN compact thresholds", () => {
    expect(formatTokens(9_999)).toBe("9,999");
    expect(formatTokens(10_000)).toBe("1万");
    expect(formatTokens(15_500)).toBe("1.6万");
    expect(formatTokens(100_000_000)).toBe("1亿");
    expect(formatTokens(123_456_789)).toBe("1.23亿");
  });

  it("formats USD micros with cents below 100 dollars and whole dollars above", () => {
    expect(formatUsdMicros(1_000_000)).toBe("$1.00");
    expect(formatUsdMicros(12_345_000)).toBe("$12.35");
    expect(formatUsdMicros(99_990_000)).toBe("$99.99");
    expect(formatUsdMicros(100_000_000)).toBe("$100");
    expect(formatUsdMicros(123_900_000)).toBe("$124");
  });
});
