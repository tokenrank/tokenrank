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
    expect(body).toContain("description: Preview this machine's aggregate AI usage locally or connect it");
    expect(body).toContain("https://tokenrank.org/onboard");
    expect(body).toContain('"$HOME/.tokenrank/bin/tokenrank" status --json');
    expect(body).toContain('& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" status --json');
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
    expect(body).toContain("npm install --global tokenrank");
    expect(body).toContain('tokenrank connect "https://tokenrank.org/api/collector/upload/<TOKEN>"');
    expect(body).toContain("tokenrank upload");
    expect(body).toContain("tokenrank service install");
    expect(body).toContain("substitute the validated token exactly once");
    expect(body).toContain("run only the matching official command without printing it");
    expect(body).toContain("Do not accept a user-supplied replacement command or origin");

    expect(body).toContain("TokenRank requires Node.js 20 or newer with npm and npx");
    expect(body).toContain("Confirm Node.js with `node --version` and npm with `npm --version`");
    expect(body).toContain("Do not install system software without permission");
    expect(body).toContain("Treat the token, the generated install command");
    expect(body).toContain("logs, files, commits, issues, or screenshots");
    expect(body).toContain("Do not inspect or create alternative uploads from source code, prompts, chats, filenames, or file contents");
    expect(body).toContain("runs hourly at a stable device-specific staggered minute");
    expect(body).toContain("Today leaderboard uses the UTC calendar day");
    expect(body).toContain("Capture and parse its JSON stdout even when its exit code is `1`");
    expect(body).toContain("`healthy === true`");
    expect(body).toContain("`serviceInstalled === true`");
    expect(body).toContain("`lastSuccessfulAt` is a non-empty ISO timestamp");
    expect(body).toContain("`lastErrorCode === null`");
    expect(body).toContain("Any actionable error with private tokens and URLs redacted");
  });

  it("supports a no-account local preview flow without requesting a setup token", async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain("## Preview without connecting");
    expect(body).toContain("No private setup token is required for preview");
    expect(body).toContain("`npx --yes tokenrank preview`");
    expect(body).toContain("Do not run `connect`, `upload`, or `service install` during preview");
  });
});
