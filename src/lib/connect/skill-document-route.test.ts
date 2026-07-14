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

  it("requires exact complete-command allowlisting and redacted handling", async () => {
    const response = GET();
    const body = await response.text();
    const unixAllowlist = String.raw`^curl -fsSL "https://tokenrank\.org/install\.sh\?token=[A-Za-z0-9_-]{32,128}" \| bash$`;
    const windowsAllowlist = String.raw`^irm "https://tokenrank\.org/install\.ps1\?token=[A-Za-z0-9_-]{32,128}" \| iex$`;

    expect(body).toContain(unixAllowlist);
    expect(body).toContain(windowsAllowlist);
    expect(body).toContain("prefix or suffix outside the exact match");
    expect(body).toContain("extra arguments");
    expect(body).toContain("a second pipe");
    expect(body).toContain("`;`, `&&`, or `||`");
    expect(body).toContain("input/output redirection");
    expect(body).toContain("command substitution or subexpressions");
    expect(body).toContain("A command that otherwise matches but appends `; whoami` is rejected");
    expect(body).toContain("Do not execute the command when validation fails");

    expect(body).toContain("Confirm that Node.js is available with `node --version`");
    expect(body).toContain("Do not install system software without permission");
    expect(body).toContain("Treat the complete command and every URL inside it as secrets");
    expect(body).toContain("logs, files, commits, issues, or screenshots");
    expect(body).toContain("Do not inspect or create alternative uploads from source code, prompts, chats, filenames, or file contents");
    expect(body).toContain("Any actionable error with private tokens and URLs redacted");
  });
});
