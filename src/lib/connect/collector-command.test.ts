import { describe, expect, it } from "vitest";

import { buildCollectorCommand } from "./collector-command";

describe("buildCollectorCommand", () => {
  it("builds a copyable onboarding command from install to first upload", () => {
    expect(buildCollectorCommand("https://tokenrank.test/api/collector/upload/abc123")).toBe(
      [
        'curl -fsSL "https://tokenrank.test/install.sh" | bash',
        '"${HOME}/.local/bin/tokenrank" connect "https://tokenrank.test/api/collector/upload/abc123"',
        '"${HOME}/.local/bin/tokenrank" preview',
        '"${HOME}/.local/bin/tokenrank" upload',
      ].join("\n"),
    );
  });
});
