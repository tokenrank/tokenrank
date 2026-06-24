import { describe, expect, it } from "vitest";

import { buildCollectorCommand, buildCollectorCommands } from "./collector-command";

describe("buildCollectorCommand", () => {
  it("builds a copyable onboarding command from install to first upload", () => {
    expect(buildCollectorCommand("https://tokenrank.test/api/collector/upload/abc123")).toBe(
      [
        'curl -fsSL "https://tokenrank.test/install.sh" | bash',
        '"${HOME}/.local/bin/tokenrank" connect "https://tokenrank.test/api/collector/upload/abc123"',
        '"${HOME}/.local/bin/tokenrank" service install --interval 300',
      ].join("\n"),
    );
  });

  it("builds Windows PowerShell onboarding commands", () => {
    expect(buildCollectorCommands("https://tokenrank.test/api/collector/upload/abc123").windows).toBe(
      [
        'irm "https://tokenrank.test/install.ps1" | iex',
        '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" connect "https://tokenrank.test/api/collector/upload/abc123"',
        '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" service install --interval 300',
      ].join("\n"),
    );
  });

  it("builds separate manual refresh commands", () => {
    const commands = buildCollectorCommands("https://tokenrank.test/api/collector/upload/abc123");

    expect(commands.unixManual).toBe(
      [
        '"${HOME}/.local/bin/tokenrank" preview',
        '"${HOME}/.local/bin/tokenrank" upload',
      ].join("\n"),
    );
    expect(commands.windowsManual).toBe(
      [
        '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" preview',
        '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" upload',
      ].join("\n"),
    );
  });
});
