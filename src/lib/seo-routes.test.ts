import { describe, expect, it } from "vitest";

import * as llms from "../../app/llms.txt/route";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";

describe("SEO and AI crawler routes", () => {
  it("publishes robots rules with sitemap discovery", () => {
    const file = robots();

    expect(file.sitemap).toBe("https://tokenrank.vercel.app/sitemap.xml");
    expect(file.host).toBe("https://tokenrank.vercel.app");
    expect(file.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/dashboard"],
        }),
        expect.objectContaining({
          userAgent: expect.arrayContaining(["GPTBot", "PerplexityBot", "ClaudeBot"]),
          allow: "/",
        }),
      ]),
    );
  });

  it("includes public pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual([
      "https://tokenrank.vercel.app/",
      "https://tokenrank.vercel.app/rules",
      "https://tokenrank.vercel.app/onboard",
    ]);
  });

  it("serves llms.txt with extractable product context", async () => {
    const response = llms.GET();
    const text = await response.text();

    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(text).toContain("# TokenRank");
    expect(text).toContain("https://tokenrank.vercel.app/onboard");
    expect(text).not.toContain("https://tokenrank.vercel.app/connect");
    expect(text).toContain("Raw prompts, code, conversations, filenames, and file contents");
    expect(text).toContain("https://tokenrank.vercel.app/api/leaderboard");
  });
});
