import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TodayPodium } from "../../components/home/today-podium";
import { getCopy } from "../i18n/copy";
import type { LeaderboardEntry } from "./types";

vi.mock("next/link", () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));

const entries = [
  { rank: 1, userId: "one", handle: "one", name: "One", score: 300 },
  { rank: 2, userId: "two", handle: "two", name: "Two", score: 200 },
  { rank: 3, userId: "three", handle: "three", name: "Three", score: 100 },
].map((entry) => ({
  ...entry,
  avatarUrl: null,
  estimatedCostMicros: 0,
  byTool: {},
})) as LeaderboardEntry[];

describe("TodayPodium", () => {
  it("renders the runner-up, champion, and third place in podium order", () => {
    const copy = getCopy("en").home;
    const { getByRole, getAllByRole } = render(
      <TodayPodium
        copy={copy.podium}
        entries={entries}
        locale="en"
        shareCopy={copy.share}
        shareText="Share today"
        shareUrl="https://tokenrank.org/?board=total&range=today#leaderboard"
      />,
    );

    expect(getByRole("heading", { name: "Today’s top 3" })).toBeDefined();
    expect(getAllByRole("article").map((article) => article.textContent)).toEqual([
      expect.stringContaining("Two"),
      expect.stringContaining("One"),
      expect.stringContaining("Three"),
    ]);
    expect(getByRole("link", { name: "Post to X" })).toBeDefined();
  });
});
