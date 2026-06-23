import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../../app/api/collector/upload/[token]/route";

const upsertUploadedUsage = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/users", () => ({
  upsertUploadedUsage,
}));

const context = {
  params: Promise.resolve({ token: "secret-token" }),
};

const validPayload = {
  deviceId: "local-device-id",
  clientVersion: "0.1.0",
  timezone: "Asia/Shanghai",
  generatedAt: "2026-06-23T12:00:00.000Z",
  entries: [
    {
      date: "2026-06-23",
      tool: "codex",
      model: "gpt-5.5",
      input: 1,
      output: 2,
      cacheRead: 3,
      cacheWrite: 4,
      total: 10,
    },
  ],
};

beforeEach(() => {
  upsertUploadedUsage.mockReset();
});

describe("collector upload route", () => {
  it("returns 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/collector/upload/secret-token", {
        method: "POST",
        body: "{",
      }),
      context,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "invalid payload",
    });
  });

  it("returns 400 for invalid payload shape", async () => {
    const response = await POST(
      new Request("http://localhost/api/collector/upload/secret-token", {
        method: "POST",
        body: JSON.stringify({ entries: [] }),
      }),
      context,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "invalid payload",
    });
  });

  it("returns 401 for invalid collector tokens", async () => {
    upsertUploadedUsage.mockResolvedValue({ ok: false, status: 401 });

    const response = await POST(
      new Request("http://localhost/api/collector/upload/secret-token", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(upsertUploadedUsage).toHaveBeenCalledWith(
      "secret-token",
      "local-device-id",
      validPayload.entries,
    );
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "invalid token",
    });
  });

  it("returns 500 for unexpected upload persistence errors", async () => {
    upsertUploadedUsage.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      new Request("http://localhost/api/collector/upload/secret-token", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
      context,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "server error",
    });
  });
});
