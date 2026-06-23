import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../app/api/me/route";

const auth = vi.hoisted(() => vi.fn());

vi.mock("@/src/auth/config", () => ({
  auth,
}));

beforeEach(() => {
  auth.mockReset();
});

describe("me route", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "unauthorized",
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
