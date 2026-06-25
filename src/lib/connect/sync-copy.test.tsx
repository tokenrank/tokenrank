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
  it("describes the connect panel automatic sync schedule as 12:00 and 24:00", () => {
    render(<WebhookTokenPanel />);

    expect(document.body.textContent).toContain("自动同步默认每天 12:00 和 24:00 运行");
    expect(document.body.textContent).not.toContain("每 5 分钟");
    expect(document.body.textContent).not.toContain("每 12 小时");
  });

  it("describes the dashboard automatic sync schedule as 12:00 and 24:00", async () => {
    render(await MePage());

    expect(document.body.textContent).toContain("自动同步默认每天 12:00 和 24:00 刷新");
    expect(document.body.textContent).not.toContain("每 5 分钟");
    expect(document.body.textContent).not.toContain("每 12 小时");
  });
});
