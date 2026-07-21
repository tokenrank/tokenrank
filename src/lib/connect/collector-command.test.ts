import { describe, expect, it } from "vitest";

import {
  buildAgentPrompt,
  buildCollectorCommand,
  buildCollectorCommands,
  buildPreviewAgentPrompt,
} from "./collector-command";

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
    expect(commands.npmManual).toBe("tokenrank preview && tokenrank upload");
  });

  it("builds a complete npm global install and connection command", () => {
    const commands = buildCollectorCommands(
      "https://tokenrank.test/api/collector/upload/abc123",
    );

    expect(commands.npm).toBe(
      [
        "npm install --global tokenrank",
        'tokenrank connect "https://tokenrank.test/api/collector/upload/abc123"',
        "tokenrank upload",
        "tokenrank service install",
      ].join(" && "),
    );
  });

  it("builds one platform-neutral Agent prompt containing only the private token", () => {
    const webhookUrl = "https://tokenrank.test/api/collector/upload/abc123";

    expect(buildAgentPrompt(webhookUrl)).toBe(
      "Follow the instructions at https://tokenrank.org/skill.md to connect this machine to TokenRank using this private setup token: abc123",
    );
    expect(buildAgentPrompt(webhookUrl)).not.toContain("\n");
    expect(buildAgentPrompt(webhookUrl)).not.toContain("curl");
    expect(buildAgentPrompt(webhookUrl)).not.toContain("PowerShell");
  });

  it("builds an account-free Agent prompt for local preview", () => {
    expect(buildPreviewAgentPrompt()).toBe(
      "Follow the instructions at https://tokenrank.org/skill.md to preview this machine's aggregate AI usage locally without connecting an account or uploading data.",
    );
  });
});
