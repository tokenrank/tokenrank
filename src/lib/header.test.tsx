import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Header } from "../../components/shell/header";

const auth = vi.hoisted(() => vi.fn());
const getUserSettings = vi.hoisted(() => vi.fn());

vi.mock("@/src/auth/config", () => ({
  auth,
}));

vi.mock("@/src/lib/users", () => ({
  getUserSettings,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("Header", () => {
  it("does not query Auth.js session storage when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;

    render(await Header());

    expect(auth).not.toHaveBeenCalled();
    expect(getUserSettings).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Dashboard");
    expect(document.body.textContent).toContain("Join");
  });

  it("renders four mobile bottom navigation actions and restores the desktop header layout", async () => {
    delete process.env.DATABASE_URL;

    render(await Header());

    const navigation = document.querySelector("header nav");
    expect(navigation).not.toBeNull();
    expect(Array.from(navigation?.classList ?? [])).toEqual(
      expect.arrayContaining(["fixed", "bottom-0", "grid-cols-4", "sm:static"]),
    );
    expect(navigation?.querySelectorAll("a")).toHaveLength(4);
  });

  it("shows the signed-in account shortcut when session storage is available", async () => {
    process.env.DATABASE_URL = "postgresql://tokenrank.test/db";
    auth.mockResolvedValue({ user: { id: "user-1" } });
    getUserSettings.mockResolvedValue({
      id: "user-1",
      handle: "alice",
      name: "Alice",
      avatarUrl: null,
      profilePublic: true,
      rankingEnabled: true,
    });

    render(await Header());

    expect(auth).toHaveBeenCalled();
    expect(getUserSettings).toHaveBeenCalledWith("user-1");
    expect(document.body.textContent).toContain("@alice");
  });
});
