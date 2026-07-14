import { describe, expect, it } from "vitest";

import { buildAgentPrompt, buildCollectorCommand, buildCollectorCommands } from "./collector-command";

describe("buildCollectorCommand", () => {
  it("builds a copyable onboarding command from install to first upload", () => {
    expect(buildCollectorCommand("https://tokenrank.test/api/collector/upload/abc123")).toBe(
      'curl -fsSL "https://tokenrank.test/install.sh?token=abc123" | bash',
    );
  });

  it("builds Windows PowerShell onboarding commands", () => {
    expect(buildCollectorCommands("https://tokenrank.test/api/collector/upload/abc123").windows).toBe(
      'irm "https://tokenrank.test/install.ps1?token=abc123" | iex',
    );
    expect(buildCollectorCommands("https://tokenrank.test/api/collector/upload/abc123").windows).not.toContain(
      "ErrorActionPreference",
    );
  });

  it("builds separate manual refresh commands", () => {
    const commands = buildCollectorCommands("https://tokenrank.test/api/collector/upload/abc123");

    expect(commands.unixManual).toBe(
      [
        '"${HOME}/.tokenrank/bin/tokenrank" preview',
        '"${HOME}/.tokenrank/bin/tokenrank" upload',
      ].join(" && "),
    );
    expect(commands.windowsManual).toBe(
      [
        '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" preview',
        "if ($LASTEXITCODE) { exit $LASTEXITCODE }",
        '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" upload',
      ].join("; "),
    );
  });

  it("builds a one-sentence Agent prompt around the private platform command", () => {
    const command = 'curl -fsSL "https://tokenrank.test/install.sh?token=abc123" | bash';

    expect(buildAgentPrompt(command)).toBe(
      `Follow the instructions at https://tokenrank.org/skill.md to connect this machine to TokenRank using this private setup command: ${command}`,
    );
    expect(buildAgentPrompt(command)).not.toContain("\n");
  });
});
