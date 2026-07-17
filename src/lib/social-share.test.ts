import { describe, expect, it } from "vitest";

import { createXShareUrl } from "./social-share";

describe("createXShareUrl", () => {
  it("keeps the card URL separate from the prefilled post text", () => {
    const shareUrl = createXShareUrl(
      "I have logged 19.56B AI tokens on TokenRank.",
      "https://tokenrank.org/u/stewartli666",
    );
    const parsed = new URL(shareUrl);

    expect(parsed.origin + parsed.pathname).toBe("https://x.com/intent/tweet");
    expect(parsed.searchParams.get("text")).toBe(
      "I have logged 19.56B AI tokens on TokenRank.",
    );
    expect(parsed.searchParams.get("url")).toBe(
      "https://tokenrank.org/u/stewartli666",
    );
    expect(parsed.searchParams.get("text")).not.toContain("tokenrank.org/u/");
  });
});
