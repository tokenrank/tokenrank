import { describe, expect, it } from "vitest";

import { buildCollectorCommand } from "./collector-command";

describe("buildCollectorCommand", () => {
  it("quotes the private webhook url in the local collector command", () => {
    expect(buildCollectorCommand("https://tokenrank.test/api/collector/upload/abc123")).toBe(
      'tokenrank connect "https://tokenrank.test/api/collector/upload/abc123" && tokenrank upload',
    );
  });
});
