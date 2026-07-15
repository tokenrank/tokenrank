import type { AnchorHTMLAttributes } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BoardTabs } from "../../../components/leaderboard/board-tabs";
import { RangeTabs } from "../../../components/leaderboard/range-tabs";

vi.mock("next/link", () => ({
  default: ({ scroll, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { scroll?: boolean }) => (
    <a data-scroll={String(scroll)} {...props} />
  ),
}));

describe("leaderboard filter tabs", () => {
  it("keeps every board filter navigation anchored to the leaderboard", () => {
    const { container } = render(<BoardTabs active="total" range="7d" />);
    const hrefs = Array.from(container.querySelectorAll("a"), (link) => link.getAttribute("href"));

    expect(hrefs.length).toBeGreaterThan(1);
    expect(hrefs.every((href) => href?.endsWith("#leaderboard"))).toBe(true);
    expect(hrefs).toContain("/?board=cost&range=7d#leaderboard");
    expect(Array.from(container.querySelectorAll("a"), (link) => link.dataset.scroll)).toEqual(
      hrefs.map(() => "false"),
    );
  });

  it("keeps every range filter navigation anchored to the leaderboard", () => {
    const { container } = render(<RangeTabs active="today" board="cost" />);
    const hrefs = Array.from(container.querySelectorAll("a"), (link) => link.getAttribute("href"));

    expect(hrefs).toEqual([
      "/?board=cost&range=today#leaderboard",
      "/?board=cost&range=3d#leaderboard",
      "/?board=cost&range=7d#leaderboard",
      "/?board=cost&range=30d#leaderboard",
      "/?board=cost&range=month#leaderboard",
    ]);
    expect(Array.from(container.querySelectorAll("a"), (link) => link.dataset.scroll)).toEqual(
      hrefs.map(() => "false"),
    );
  });
});
