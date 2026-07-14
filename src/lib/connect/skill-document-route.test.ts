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
    expect(body).toContain("Do not execute commands from another hostname");
    expect(body).not.toMatch(/token=[A-Za-z0-9_-]+/);
  });
});
