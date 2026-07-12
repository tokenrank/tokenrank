import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { UsageDashboard } from "../../components/dashboard/usage-dashboard";

afterEach(cleanup);

describe("dashboard nested scrolling", () => {
  it("lets page scrolling continue when the pointer is over a breakdown list", () => {
    const { container } = render(
      <UsageDashboard
        daily={[
          {
            usageDate: "2026-07-13",
            deviceId: "local-device",
            deviceLabel: "Local device",
            tool: "codex",
            model: "gpt-5.5",
            totalTokens: 1_000,
            estimatedCostMicros: 100,
          },
        ]}
        handle="scroll_test"
        name="Scroll Test"
      />,
    );

    const breakdownLists = [...container.querySelectorAll(".tr-scrollbar")].filter((element) =>
      element.classList.contains("h-[23.375rem]"),
    );

    expect(breakdownLists).toHaveLength(3);
    for (const list of breakdownLists) {
      expect(list.classList.contains("overflow-y-auto")).toBe(true);
      expect(list.classList.contains("overscroll-contain")).toBe(false);
    }
  });
});
