import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UploadCompletionRedirect } from "../../../components/connect/upload-completion-redirect";
import { WebhookTokenPanel } from "../../../components/connect/webhook-token-panel";
import DashboardPage from "../../../app/dashboard/page";
import OnboardPage from "../../../app/onboard/page";

const originalNavigatorPlatform = window.navigator.platform;
const originalNavigatorUserAgent = window.navigator.userAgent;
const getXSignInGuard = vi.hoisted(() => vi.fn(async () => ({})));
const getUserUploadStatus = vi.hoisted(() =>
  vi.fn(async () => ({
    hasUsage: false,
    latestUploadedAt: null,
  })),
);
const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("@/src/auth/config", () => ({
  auth: vi.fn(async () => ({
    user: {
      id: "user-1",
      name: "TokenRank User",
    },
  })),
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
});

describe("collector sync interval copy", () => {
  it("describes the onboarding panel automatic sync schedule as 12:00 and 24:00", () => {
    render(<WebhookTokenPanel />);

    expect(document.body.textContent).toContain("uploads once immediately");
    expect(document.body.textContent).toContain("Automatic sync runs at 12:00 and 24:00 by default");
    expect(document.body.textContent).toContain("runs silently in the background");
    expect(document.body.textContent).toContain("recovers once after your next login");
    expect(document.body.textContent).toContain("actual AI tool without double counting");
    expect(document.body.textContent).not.toContain("每 5 分钟");
    expect(document.body.textContent).not.toContain("每 12 小时");
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

    const { getByRole, container } = render(<WebhookTokenPanel />);
    fireEvent.click(getByRole("button", { name: "Generate upload URL" }));

    await waitFor(() => {
      expect(getByRole("button", { name: "Windows PowerShell" }).className).toContain("bg-[color:var(--tr-gold)]");
      expect(container.querySelector("pre.overflow-x-scroll code")?.textContent).toContain(
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
