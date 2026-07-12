import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../../app/api/webhook-tokens/route";

const auth = vi.hoisted(() => vi.fn());
const createWebhookSecret = vi.hoisted(() => vi.fn());
const hashSecret = vi.hoisted(() => vi.fn());
const insertValues = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  insert: vi.fn(() => ({
    values: insertValues,
  })),
}));

vi.mock("@/src/auth/config", () => ({
  auth,
}));

vi.mock("@/src/db/client", () => ({
  db,
}));

vi.mock("@/src/lib/security/tokens", () => ({
  createWebhookSecret,
  hashSecret,
}));

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalNodeEnv = process.env.NODE_ENV;

function webhookRequest(origin = "http://localhost:3000") {
  return new Request(`${origin}/api/webhook-tokens`, { method: "POST" });
}

beforeEach(() => {
  auth.mockReset();
  createWebhookSecret.mockReset();
  hashSecret.mockReset();
  db.insert.mockClear();
  insertValues.mockReset();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3010";
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  process.env.NODE_ENV = originalNodeEnv;
});

describe("webhook token route", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "unauthorized",
    });
  });

  it("stores only the hashed token and returns the private webhook URL", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    createWebhookSecret.mockReturnValue("plain-webhook-secret");
    hashSecret.mockReturnValue("hashed-webhook-secret");
    insertValues.mockResolvedValue(undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(insertValues).toHaveBeenCalledWith({
      userId: "user-1",
      tokenHash: "hashed-webhook-secret",
      label: "default",
    });
    await expect(response.json()).resolves.toEqual({
      status: 0,
      webhookUrl: "http://localhost:3000/api/collector/upload/plain-webhook-secret",
    });
  });

  it("uses the configured canonical URL in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://tokenrank.example/";
    auth.mockResolvedValue({ user: { id: "user-1" } });
    createWebhookSecret.mockReturnValue("plain-webhook-secret");
    hashSecret.mockReturnValue("hashed-webhook-secret");
    insertValues.mockResolvedValue(undefined);

    const response = await POST(webhookRequest("http://internal-host:3000"));

    await expect(response.json()).resolves.toEqual({
      status: 0,
      webhookUrl: "https://tokenrank.example/api/collector/upload/plain-webhook-secret",
    });
  });

  it("normalizes a wildcard development origin to localhost", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    createWebhookSecret.mockReturnValue("plain-webhook-secret");
    hashSecret.mockReturnValue("hashed-webhook-secret");
    insertValues.mockResolvedValue(undefined);

    const response = await POST(webhookRequest("http://0.0.0.0:3000"));

    await expect(response.json()).resolves.toEqual({
      status: 0,
      webhookUrl: "http://localhost:3000/api/collector/upload/plain-webhook-secret",
    });
  });

  it("returns 500 JSON for unexpected token creation errors", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    createWebhookSecret.mockReturnValue("plain-webhook-secret");
    hashSecret.mockReturnValue("hashed-webhook-secret");
    insertValues.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "server error",
    });
  });
});
