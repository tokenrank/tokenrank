import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WebhookTokenPanel } from "../../../components/connect/webhook-token-panel";
import MePage from "../../../app/me/page";

vi.mock("@/src/auth/config", () => ({
  auth: vi.fn(async () => ({
    user: {
      name: "TokenRank User",
    },
  })),
}));

afterEach(() => {
  cleanup();
});

describe("collector sync interval copy", () => {
  it("describes the connect panel automatic sync interval as 12 hours", () => {
    render(<WebhookTokenPanel />);

    expect(document.body.textContent).toContain("自动同步默认每 12 小时运行一次");
    expect(document.body.textContent).not.toContain("每 5 分钟");
  });

  it("describes the dashboard automatic sync interval as 12 hours", async () => {
    render(await MePage());

    expect(document.body.textContent).toContain("自动同步默认每 12 小时刷新一次");
    expect(document.body.textContent).not.toContain("每 5 分钟");
  });
});
