import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UploadCompletionRedirect } from "../../../components/connect/upload-completion-redirect";
import { WebhookTokenPanel } from "../../../components/connect/webhook-token-panel";
import DashboardPage from "../../../app/dashboard/page";
import OnboardPage from "../../../app/onboard/page";
import { defaultCopy, getCopy } from "../../i18n/copy";

const originalNavigatorPlatform = window.navigator.platform;
const originalNavigatorUserAgent = window.navigator.userAgent;
const originalNavigatorClipboard = window.navigator.clipboard;
const originalScrollIntoView = Element.prototype.scrollIntoView;
const auth = vi.hoisted(() =>
  vi.fn(async () => ({
    user: {
      id: "user-1",
      name: "TokenRank User",
    },
  })),
);
const getXSignInGuard = vi.hoisted(() => vi.fn(async () => ({})));
const getUserUploadStatus = vi.hoisted(() =>
  vi.fn<
    () => Promise<{
      hasUsage: boolean;
      latestUploadedAt: string | null;
    }>
  >(async () => ({
      hasUsage: false,
      latestUploadedAt: null,
    })),
);
const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("@/src/auth/config", () => ({
  auth,
}));

vi.mock("@/src/auth/sign-in-guard", () => ({
  getXSignInGuard,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplace,
  }),
}));

vi.mock("@/src/lib/users", () => ({
  getUserDashboard: vi.fn(async () => ({
    user: {
      id: "user-1",
      handle: "tokenrank_user",
      name: "TokenRank User",
      avatarUrl: null,
      profilePublic: true,
      rankingEnabled: true,
    },
    daily: [],
  })),
  getUserUploadStatus,
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: originalNavigatorPlatform,
  });
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: originalNavigatorUserAgent,
  });
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: originalNavigatorClipboard,
  });
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: originalScrollIntoView,
  });
});

describe("collector sync interval copy", () => {
  it("describes hourly staggered automatic synchronization", () => {
    render(<WebhookTokenPanel />);

    expect(document.body.textContent).toContain("give the secure prompt to a trusted coding agent");
    expect(document.body.textContent).toContain("run the platform command yourself");
    expect(document.body.textContent).toContain("runs hourly at a device-specific staggered minute");
    expect(document.body.textContent).toContain("skips unchanged data");
    expect(document.body.textContent).not.toContain("每 5 分钟");
    expect(document.body.textContent).not.toContain("每 12 小时");
    expect(defaultCopy.ranges.today).toBe("Today · UTC");
    expect(getCopy("zh").ranges.today).toBe("今日 · UTC");
  });

  it("warns users not to expose the private setup token in screenshots or final responses", () => {
    expect(defaultCopy.onboard.webhook.agentSecurity).toBe(
      "This prompt contains your private setup token. Share it only with an agent you trust. Never post, screenshot, or commit it, and make sure the agent does not repeat it in its final response.",
    );
    expect(getCopy("zh").onboard.webhook.agentSecurity).toBe(
      "这段 Prompt 包含你的私有 setup token，只能交给可信 Agent。不要发布、截图或提交到仓库，并确保 Agent 不在最终回复中重复秘密。",
    );
  });

  it("defaults to the Agent method and copies the private one-sentence prompt", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(window.navigator, "platform", { configurable: true, value: "Linux x86_64" });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (X11; Linux x86_64)",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl: "https://tokenrank.test/api/collector/upload/agent-prompt-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { getByRole, queryByRole } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));

    const agentTab = await waitFor(() => getByRole("tab", { name: "Ask an agent" }));
    expect(agentTab.getAttribute("aria-selected")).toBe("true");
    expect(queryByRole("tabpanel", { name: "Run in terminal" })).toBeNull();
    const agentPanel = getByRole("tabpanel", { name: "Ask an agent" });
    expect(agentPanel.textContent).toContain(
      "https://tokenrank.org/skill.md",
    );
    expect(agentPanel.textContent).toContain("private setup token: agent-prompt-token");
    expect(agentPanel.textContent).not.toContain("install.sh");
    expect(queryByRole("group", { name: "Setup platform" })).toBeNull();
    expect(agentPanel.querySelector("pre.overflow-x-scroll code.whitespace-pre")).not.toBeNull();

    fireEvent.click(getByRole("button", { name: "Copy Agent prompt" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "Follow the instructions at https://tokenrank.org/skill.md to connect this machine to TokenRank using this private setup token: agent-prompt-token",
      );
    });
  });

  it("shows an accessible fallback when Agent prompt copying is rejected", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl: "https://tokenrank.test/api/collector/upload/agent-copy-rejected-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { getByRole } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));
    const copyButton = await waitFor(() => getByRole("button", { name: "Copy Agent prompt" }));
    fireEvent.click(copyButton);

    expect((await waitFor(() => getByRole("alert"))).textContent).toContain(
      "Copy failed. Select the text and copy it manually.",
    );
    expect(copyButton.textContent).not.toContain("Copied");
    expect(getByRole("tabpanel", { name: "Ask an agent" }).textContent).toContain(
      "agent-copy-rejected-token",
    );
  });

  it("shows an accessible fallback when the terminal clipboard API is missing", async () => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.navigator, "platform", { configurable: true, value: "Linux x86_64" });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (X11; Linux x86_64)",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl: "https://tokenrank.test/api/collector/upload/terminal-copy-missing-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { getByRole } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));
    fireEvent.click(await waitFor(() => getByRole("tab", { name: "Run in terminal" })));
    const copyButton = getByRole("button", { name: "Copy macOS / Linux" });
    fireEvent.click(copyButton);

    expect((await waitFor(() => getByRole("alert"))).textContent).toContain(
      "Copy failed. Select the text and copy it manually.",
    );
    expect(copyButton.textContent).not.toContain("Copied");
    expect(getByRole("tabpanel", { name: "Run in terminal" }).textContent).toContain(
      "terminal-copy-missing-token",
    );
  });

  it("shows terminal commands only after selecting the terminal method", async () => {
    Object.defineProperty(window.navigator, "platform", { configurable: true, value: "Linux x86_64" });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (X11; Linux x86_64)",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl: "https://tokenrank.test/api/collector/upload/terminal-tab-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { getByRole, queryByText } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));
    await waitFor(() => getByRole("tab", { name: "Run in terminal" }));

    expect(queryByText("Manual refresh")).toBeNull();
    fireEvent.click(getByRole("tab", { name: "Run in terminal" }));
    expect(getByRole("button", { name: "macOS / Linux" })).not.toBeNull();
    expect(queryByText("macOS")).toBeNull();
    expect(queryByText("Linux")).toBeNull();
    expect(getByRole("tabpanel", { name: "Run in terminal" }).textContent).toContain("Manual refresh");
    expect(getByRole("tabpanel", { name: "Run in terminal" }).textContent).toContain(
      "install.sh?token=terminal-tab-token",
    );
  });

  it("supports arrow-key method switching while keeping the Agent prompt platform-neutral", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl: "https://tokenrank.test/api/collector/upload/keyboard-tab-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { getByRole } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));
    const agentTab = await waitFor(() => getByRole("tab", { name: "Ask an agent" }));

    fireEvent.keyDown(agentTab, { key: "ArrowRight" });
    expect(getByRole("tab", { name: "Run in terminal" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(getByRole("button", { name: "Windows PowerShell" }));
    fireEvent.keyDown(getByRole("tab", { name: "Run in terminal" }), { key: "ArrowLeft" });
    expect(getByRole("tabpanel", { name: "Ask an agent" }).textContent).toContain(
      "private setup token: keyboard-tab-token",
    );
    expect(getByRole("tabpanel", { name: "Ask an agent" }).textContent).not.toContain("install.ps1");
  });

  it("keeps generated one-line commands inside a horizontally scrollable row", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl:
            "https://tokenrank.test/api/collector/upload/very-long-private-webhook-token-for-layout-regression",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { getByRole, container } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));

    fireEvent.click(await waitFor(() => getByRole("tab", { name: "Run in terminal" })));

    await waitFor(() => {
      expect(container.querySelector("pre.overflow-x-scroll")).not.toBeNull();
    });

    const commandRows = Array.from(container.querySelectorAll("div")).filter((node) =>
      node.className.includes("grid-cols-[minmax(0,1fr)_auto]"),
    );

    expect(commandRows.length).toBeGreaterThan(0);
    expect(container.querySelector("section")?.className).toContain("min-w-0");
    expect(container.querySelector("pre.overflow-x-scroll code")?.textContent).toContain(
      "very-long-private-webhook-token-for-layout-regression",
    );
  });

  it("scrolls to the command copy section after generating an upload URL", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "Linux x86_64",
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (X11; Linux x86_64)",
    });
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl: "https://tokenrank.test/api/collector/upload/scroll-to-command-token",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { getByRole } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    });

    const scrolledSection = scrollIntoView.mock.instances[0] as Element;
    expect(scrolledSection.textContent).toContain("https://tokenrank.org/skill.md");
    expect(scrolledSection.textContent).toContain(
      "scroll-to-command-token",
    );

    fireEvent.click(getByRole("tab", { name: "Run in terminal" }));
    fireEvent.click(getByRole("button", { name: "Windows PowerShell" }));
    await waitFor(() => {
      expect(scrolledSection.textContent).toContain("install.ps1?token=scroll-to-command-token");
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("auto-selects the Windows command tab on Windows browsers", async () => {
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "Win32",
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 0,
          webhookUrl:
            "https://tokenrank.test/api/collector/upload/windows-auto-select-token",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { getByRole } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));

    await waitFor(() => {
      expect(getByRole("tabpanel", { name: "Ask an agent" }).textContent).toContain(
        "private setup token: windows-auto-select-token",
      );
    });
    fireEvent.click(getByRole("tab", { name: "Run in terminal" }));
    await waitFor(() => {
      expect(getByRole("button", { name: "Windows PowerShell" }).className).toContain("bg-[color:var(--tr-gold)]");
      expect(getByRole("tabpanel", { name: "Run in terminal" }).textContent).toContain(
        "install.ps1?token=windows-auto-select-token",
      );
    });
  });

  it("automatically opens the dashboard after a new upload is detected", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 0,
          upload: {
            hasUsage: true,
            latestUploadedAt: "2026-07-06T08:00:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<UploadCompletionRedirect initialLatestUploadedAt={null} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(fetch).toHaveBeenCalledWith("/api/dashboard", { cache: "no-store" });
    expect(routerReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("does not leave onboarding just because the user has historical uploads", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 0,
          upload: {
            hasUsage: true,
            latestUploadedAt: "2026-07-06T08:00:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<UploadCompletionRedirect initialLatestUploadedAt="2026-07-06T08:00:00.000Z" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(fetch).toHaveBeenCalledWith("/api/dashboard", { cache: "no-store" });
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("links the dashboard back to onboarding for setup commands", async () => {
    const { container } = render(await DashboardPage());

    expect(getXSignInGuard).toHaveBeenCalledWith("/dashboard", "en");
    expect(container.innerHTML).toContain('href="/onboard"');
    expect(container.innerHTML).not.toContain('href="/connect"');
  });

  it("renders onboarding when the upload timestamp is already serialized", async () => {
    getUserUploadStatus.mockResolvedValueOnce({
      hasUsage: true,
      latestUploadedAt: "2026-07-06T08:00:00.000Z",
    });

    const { container } = render(await OnboardPage());

    expect(getUserUploadStatus).toHaveBeenCalledWith("user-1");
    expect(container.textContent).toContain("TokenRank User");
    expect(container.textContent).toContain("Generate upload URL");
  });

  it("renders missing local account services as a contained status instead of an error", async () => {
    auth.mockResolvedValueOnce(null);
    getXSignInGuard.mockResolvedValueOnce({
      disabledReason: defaultCopy.auth.guard.missingDatabase,
    });

    const { container, getByRole, getByTestId } = render(await OnboardPage());
    const identityCard = getByTestId("identity-claim-card");

    expect(getByRole("status").textContent).toContain("Sign-in status");
    expect(identityCard.textContent).toContain("This local preview is not connected to the account service");
    expect(container.textContent).not.toContain("DATABASE_URL");
    expect(identityCard.querySelector("button")?.hasAttribute("disabled")).toBe(true);
  });

  it("keeps signed-out dashboard actions balanced when local X login is available", async () => {
    auth.mockResolvedValueOnce(null);
    getXSignInGuard.mockResolvedValueOnce({});

    const { getByRole, getByTestId, queryByRole } = render(await DashboardPage());
    const card = getByTestId("signed-out-dashboard-card");
    const actions = getByTestId("signed-out-dashboard-actions");
    const onboardingLink = getByRole("link", { name: "Preview before joining" });

    expect(card.querySelector("button")?.hasAttribute("disabled")).toBe(false);
    expect(actions.className).toContain("sm:grid-cols-2");
    expect(actions.className).toContain("xl:grid-cols-1");
    expect(onboardingLink.getAttribute("href")).toBe("/onboard");
    expect(queryByRole("status")).toBeNull();
  });

  it("does not link sign out to the Auth.js confirmation page", async () => {
    const { container, getByRole } = render(await DashboardPage());

    expect(getByRole("button", { name: "Sign out" })).toBeDefined();
    expect(container.innerHTML).not.toContain("/api/auth/signout");
  });

  it("signs out directly from the dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise<Response>(() => {}));
    const { getByRole } = render(await DashboardPage());

    fireEvent.click(getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/dashboard/signout", {
        method: "POST",
        credentials: "same-origin",
      });
    });
  });
});
