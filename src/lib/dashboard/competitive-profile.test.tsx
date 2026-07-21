import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { UsageDashboard } from "@/components/dashboard/usage-dashboard";

afterEach(cleanup);

describe("public competitive profile", () => {
  it("renders rank context and builds a challenge-aware share loop", () => {
    render(
      <UsageDashboard
        competitive={{
          rank: 2,
          participants: 5,
          topPercent: 40,
          currentStreak: 3,
          last7Tokens: 2_000,
          previous7Tokens: 1_000,
          changePercent: 100,
        }}
        daily={[
          {
            usageDate: "2026-07-19",
            tool: "codex",
            model: "gpt-5.5",
            totalTokens: 2_000,
            estimatedCostMicros: 100,
          },
        ]}
        handle="alice"
        name="Alice"
      />,
    );

    expect(screen.getByText("#02")).not.toBeNull();
    expect(screen.getByText("Top 40% of 5")).not.toBeNull();
    expect(screen.getByText("3 days")).not.toBeNull();
    expect(screen.getByText("+100%")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Beat my rank" }).getAttribute("href")).toBe(
      "/onboard?challenge=alice",
    );

    const shareHref = screen.getByRole("link", { name: "Share on X" }).getAttribute("href");
    const shareText = new URL(shareHref ?? "https://x.com").searchParams.get("text") ?? "";
    expect(shareText).toContain("I'm #2 on TokenRank's 7-day AI activity board");
    expect(shareText).toContain("3-day streak");
  });
});
