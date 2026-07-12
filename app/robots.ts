import type { MetadataRoute } from "next";

import { absoluteUrl, siteUrl } from "@/src/lib/site";

const publicCrawlers = [
  "GPTBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  const shared = {
    allow: "/",
    disallow: ["/api/", "/dashboard"],
  };

  return {
    rules: [
      {
        userAgent: "*",
        ...shared,
      },
      {
        userAgent: publicCrawlers,
        ...shared,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
