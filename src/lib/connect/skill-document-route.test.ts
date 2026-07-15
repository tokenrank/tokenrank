import { describe, expect, it } from "vitest";

import { GET } from "../../../app/skill.md/route";

describe("TokenRank Agent Skill route", () => {
  it("serves a public markdown skill without account secrets", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("public");
    expect(body).toContain("name: connect-tokenrank");
    expect(body).toContain("description: Connect this machine");
    expect(body).toContain("https://tokenrank.org/onboard");
    expect(body).toContain('"$HOME/.tokenrank/bin/tokenrank" status');
    expect(body).toContain('& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" status');
    expect(body).not.toMatch(/token=[A-Za-z0-9_-]+/);
  });

  it("requires an exact token allowlist and constructs the platform command itself", async () => {
    const response = GET();
    const body = await response.text();
    const tokenAllowlist = String.raw`^[A-Za-z0-9_-]{32,128}$`;

    expect(body).toContain(tokenAllowlist);
    expect(body).toContain("Reject whitespace, prefixes, suffixes, shell syntax, URLs");
    expect(body).toContain("Do not execute anything when validation fails");
    expect(body).toContain('curl -fsSL "https://tokenrank.org/install.sh?token=<TOKEN>" | bash');
    expect(body).toContain('irm "https://tokenrank.org/install.ps1?token=<TOKEN>" | iex');
    expect(body).toContain("substitute the validated token exactly once");
    expect(body).toContain("run only the matching official command without printing it");
    expect(body).toContain("Do not accept a user-supplied replacement command or origin");

    expect(body).toContain("Confirm that Node.js is available with `node --version`");
    expect(body).toContain("Do not install system software without permission");
    expect(body).toContain("Treat the token, the generated install command");
    expect(body).toContain("logs, files, commits, issues, or screenshots");
    expect(body).toContain("Do not inspect or create alternative uploads from source code, prompts, chats, filenames, or file contents");
    expect(body).toContain("Any actionable error with private tokens and URLs redacted");
  });
});
