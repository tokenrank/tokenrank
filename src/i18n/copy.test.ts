import { describe, expect, it } from "vitest";

import { getCopy } from "./copy";

function chineseTitles(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const current = /(?:^title$|Title$)/.test(key) && typeof child === "string" ? [child] : [];
    return [...current, ...chineseTitles(child)];
  });
}

describe("Chinese page titles", () => {
  it("does not end headings with a Chinese full stop", () => {
    const titlesWithFullStops = chineseTitles(getCopy("zh")).filter((title) =>
      title.trim().endsWith("。"),
    );

    expect(titlesWithFullStops).toEqual([]);
  });
});

describe("public trust copy", () => {
  it("states the current evidence boundary without implying provider verification", () => {
    const english = getCopy("en");
    const chinese = getCopy("zh");

    expect(english.home.hero.signal).toBe("An activity signal, not a productivity score.");
    expect(english.home.table.dataFeed).toBe("Local aggregate / server checked");
    expect(english.home.trust.note).toContain("Not Provider Verified");
    expect(chinese.home.trust.note).toContain("不是 Provider Verified");
    expect(english.onboard.preview.command).toBe("npx --yes tokenrank preview");
    expect(english.onboard.signIn.statusLabel).toBe("Sign-in status");
    expect(chinese.onboard.signIn.statusLabel).toBe("登录状态");
    expect(english.auth.guard.missingDatabase).not.toContain("DATABASE_URL");
    expect(chinese.auth.guard.missingDatabase).not.toContain("DATABASE_URL");
  });
});
