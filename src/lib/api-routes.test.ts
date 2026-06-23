import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getLeaderboard } from "../../app/api/leaderboard/route";
import { GET as getUserProfile } from "../../app/api/users/[handle]/route";

const usersService = vi.hoisted(() => ({
  getLeaderboard: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("@/src/lib/users", () => usersService);

beforeEach(() => {
  usersService.getLeaderboard.mockReset();
  usersService.getProfile.mockReset();
});

describe("leaderboard route", () => {
  it("returns 500 JSON for unexpected leaderboard errors", async () => {
    usersService.getLeaderboard.mockRejectedValue(new Error("database unavailable"));

    const response = await getLeaderboard(
      new Request("http://localhost/api/leaderboard?board=total&range=7d"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "server error",
    });
  });
});

describe("profile route", () => {
  it("returns 500 JSON for unexpected profile errors", async () => {
    usersService.getProfile.mockRejectedValue(new Error("database unavailable"));

    const response = await getUserProfile(new Request("http://localhost/api/users/alice"), {
      params: Promise.resolve({ handle: "alice" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "server error",
    });
  });
});
