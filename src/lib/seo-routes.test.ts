import { describe, expect, it } from "vitest";

import * as llms from "../../app/llms.txt/route";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";

describe("SEO and AI crawler routes", () => {
  it("publishes robots rules with sitemap discovery", () => {
    const file = robots();

    expect(file.sitemap).toBe("https://tokenrank.org/sitemap.xml");
    expect(file.host).toBe("https://tokenrank.org");
    expect(file.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userAgent: "*",
          allow: "/",
          disallow: ["/api/"],
        }),
        expect.objectContaining({
          userAgent: expect.arrayContaining(["GPTBot", "PerplexityBot", "ClaudeBot"]),
          allow: "/",
        }),
      ]),
    );
  });

  it("includes indexable public pages and excludes noindex onboarding", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const urls = (await sitemap()).map((entry) => entry.url);
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    expect(urls).toEqual([
      "https://tokenrank.org/",
      "https://tokenrank.org/rules",
    ]);
    expect(urls).not.toContain("https://tokenrank.org/onboard");
  });

  it("serves llms.txt with extractable product context", async () => {
    const response = llms.GET();
    const text = await response.text();

    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(text).toContain("# TokenRank");
    expect(text).toContain("https://tokenrank.org/onboard");
    expect(text).toContain("https://tokenrank.org/#faq");
    expect(text).not.toContain("https://tokenrank.org/connect");
    expect(text).toContain("Raw prompts, code, conversations, filenames, and file contents");
    expect(text).toContain("https://tokenrank.org/api/leaderboard");
  });
});
