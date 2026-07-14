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
