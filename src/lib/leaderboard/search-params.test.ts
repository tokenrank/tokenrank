import { describe, expect, it } from "vitest";

import { parseLeaderboardSearchParams } from "./search-params";

describe("parseLeaderboardSearchParams", () => {
  it("keeps valid board and range values", () => {
    expect(parseLeaderboardSearchParams({ board: "qwen", range: "7d" })).toEqual({
      board: "qwen",
      range: "7d",
    });
  });

  it("falls back to total today for invalid values", () => {
    expect(parseLeaderboardSearchParams({ board: "unknown", range: "forever" })).toEqual({
      board: "total",
      range: "today",
    });
  });
});
