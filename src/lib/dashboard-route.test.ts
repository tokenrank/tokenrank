import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "../../app/api/dashboard/route";

const auth = vi.hoisted(() => vi.fn());
const getUserSettings = vi.hoisted(() => vi.fn());
const getUserUploadStatus = vi.hoisted(() => vi.fn());
const updateUserSettings = vi.hoisted(() => vi.fn());

vi.mock("@/src/auth/config", () => ({
  auth,
}));

vi.mock("@/src/lib/users", () => ({
  getUserSettings,
  getUserUploadStatus,
  updateUserSettings,
}));

beforeEach(() => {
  auth.mockReset();
  getUserSettings.mockReset();
  getUserUploadStatus.mockReset();
  updateUserSettings.mockReset();
});

describe("dashboard route", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "unauthorized",
    });
  });

  it("returns current settings and upload status for the authenticated user", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    getUserSettings.mockResolvedValue({
      id: "user-1",
      handle: "alice",
      name: "Alice",
      avatarUrl: null,
      profilePublic: true,
      rankingEnabled: false,
    });
    getUserUploadStatus.mockResolvedValue({
      hasUsage: true,
      latestUploadedAt: new Date("2026-07-06T08:00:00.000Z"),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(getUserSettings).toHaveBeenCalledWith("user-1");
    expect(getUserUploadStatus).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toEqual({
      status: 0,
      user: {
        id: "user-1",
        handle: "alice",
        name: "Alice",
        avatarUrl: null,
        profilePublic: true,
        rankingEnabled: false,
      },
      upload: {
        hasUsage: true,
        latestUploadedAt: "2026-07-06T08:00:00.000Z",
      },
    });
  });

  it("updates only the authenticated user's public settings", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    updateUserSettings.mockResolvedValue({
      id: "user-1",
      handle: "alice",
      name: "Alice",
      avatarUrl: null,
      profilePublic: false,
      rankingEnabled: true,
    });

    const response = await PATCH(
      new Request("http://localhost/api/dashboard", {
        method: "PATCH",
        body: JSON.stringify({ profilePublic: false, rankingEnabled: true }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateUserSettings).toHaveBeenCalledWith("user-1", {
      profilePublic: false,
      rankingEnabled: true,
    });
    await expect(response.json()).resolves.toEqual({
      status: 0,
      user: {
        id: "user-1",
        handle: "alice",
        name: "Alice",
        avatarUrl: null,
        profilePublic: false,
        rankingEnabled: true,
      },
    });
  });

  it("rejects invalid settings payloads", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await PATCH(
      new Request("http://localhost/api/dashboard", {
        method: "PATCH",
        body: JSON.stringify({ profilePublic: "yes" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(updateUserSettings).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "invalid payload",
    });
  });

  it("returns 500 JSON for unexpected auth lookup errors", async () => {
    auth.mockRejectedValue(new Error("session store unavailable"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "server error",
    });
  });
});
