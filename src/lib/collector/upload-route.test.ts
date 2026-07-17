import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../../app/api/collector/upload/[token]/route";
import { hashUploadEntries } from "./upload";

const upsertUploadedUsage = vi.hoisted(() => vi.fn());
const authenticateUploadToken = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/users", () => ({
  authenticateUploadToken,
  upsertUploadedUsage,
}));

const validToken = "a".repeat(43);
const context = {
  params: Promise.resolve({ token: validToken }),
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
  authenticateUploadToken.mockReset();
  authenticateUploadToken.mockResolvedValue({
    id: "webhook-token-id",
    userId: "user-id",
  });
});

describe("collector upload route", () => {
  it("returns a stable opaque account identity before any upload", async () => {
    const response = await GET(
      new Request(`http://localhost/api/collector/upload/${validToken}`),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toEqual({
      status: 0,
      accountId: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(body)).not.toContain(validToken);
    expect(JSON.stringify(body)).not.toContain("user-id");
  });

  it("does not reveal an account identity for an invalid token", async () => {
    authenticateUploadToken.mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/collector/upload/${validToken}`),
      context,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ status: -1, error: "invalid token" });
  });

  it("forwards verified v2 full snapshot metadata", async () => {
    upsertUploadedUsage.mockResolvedValue({
      ok: true,
      status: 200,
      uploaded: 1,
      committed: true,
      revision: 1,
    });
    const batchHash = await hashUploadEntries(validPayload.entries);
    const payload = {
      ...validPayload,
      accountingVersion: 2,
      syncMode: "full",
      snapshotId: "snapshot_20260716_020000",
      cutoverDate: "2026-06-23",
      batchHash,
      batchIndex: 0,
      batchCount: 1,
    } as const;
    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(upsertUploadedUsage).toHaveBeenCalledWith(
      validToken,
      validPayload.deviceId,
      validPayload.entries,
      {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: payload.snapshotId,
        cutoverDate: payload.cutoverDate,
        batchHash,
        batchIndex: 0,
        batchCount: 1,
      },
      { id: "webhook-token-id", userId: "user-id" },
    );
  });

  it("rejects full snapshot batches whose content hash does not match", async () => {
    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          accountingVersion: 2,
          syncMode: "full",
          snapshotId: "snapshot_20260716_020000",
          cutoverDate: "2026-06-23",
          batchHash: "a".repeat(64),
          batchIndex: 0,
          batchCount: 1,
        }),
      }),
      context,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ status: -1, error: "invalid batch hash" });
    expect(upsertUploadedUsage).not.toHaveBeenCalled();
  });

  it("returns an explicit upgrade error for downgraded collectors", async () => {
    upsertUploadedUsage.mockResolvedValue({
      ok: false,
      status: 409,
      error: "upgrade_required",
    });

    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
      context,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "collector upgrade required",
    });
  });

  it("returns an explicit device-limit error", async () => {
    upsertUploadedUsage.mockResolvedValue({
      ok: false,
      status: 409,
      error: "device_limit",
    });

    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
      context,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "device limit reached",
    });
  });

  it("returns the expected cutover date for safe state recovery", async () => {
    upsertUploadedUsage.mockResolvedValue({
      ok: false,
      status: 409,
      error: "cutover_date_conflict",
      expectedCutoverDate: "2026-06-23",
      revision: 4,
    });
    const batchHash = await hashUploadEntries(validPayload.entries);

    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          accountingVersion: 2,
          syncMode: "full",
          snapshotId: "550e8400-e29b-41d4-a716-446655440000",
          cutoverDate: "2026-06-22",
          batchHash,
          batchIndex: 0,
          batchCount: 1,
        }),
      }),
      context,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "CUTOVER_DATE_CONFLICT",
      expectedCutoverDate: "2026-06-23",
      revision: 4,
    });
  });

  it("returns the active snapshot identity for safe token rotation recovery", async () => {
    upsertUploadedUsage.mockResolvedValue({
      ok: false,
      status: 409,
      error: "active_snapshot_conflict",
      activeSnapshotId: "550e8400-e29b-41d4-a716-446655440000",
      expectedCutoverDate: "2026-06-23",
      revision: 1,
    });
    const batchHash = await hashUploadEntries(validPayload.entries);

    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          accountingVersion: 2,
          syncMode: "full",
          snapshotId: "9f1c4a42-1d54-4698-8f91-82f75ad379fb",
          cutoverDate: "2026-06-23",
          batchHash,
          batchIndex: 0,
          batchCount: 1,
        }),
      }),
      context,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "ACTIVE_SNAPSHOT_CONFLICT",
      activeSnapshotId: "550e8400-e29b-41d4-a716-446655440000",
      expectedCutoverDate: "2026-06-23",
      revision: 1,
    });
  });

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
    authenticateUploadToken.mockResolvedValue(null);

    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(authenticateUploadToken).toHaveBeenCalledWith(validToken);
    expect(upsertUploadedUsage).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "invalid token",
    });
  });

  it("rejects malformed collector tokens before parsing the body", async () => {
    const response = await POST(
      new Request("http://localhost/api/collector/upload/not-a-secret", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
      { params: Promise.resolve({ token: "not-a-secret" }) },
    );

    expect(response.status).toBe(401);
    expect(authenticateUploadToken).not.toHaveBeenCalled();
    expect(upsertUploadedUsage).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "invalid token",
    });
  });

  it("returns 413 before parsing oversized upload bodies", async () => {
    const response = await POST(
      new Request(`http://localhost/api/collector/upload/${validToken}`, {
        method: "POST",
        body: JSON.stringify({ padding: "x".repeat(512 * 1024) }),
      }),
      context,
    );

    expect(response.status).toBe(413);
    expect(upsertUploadedUsage).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: -1,
      error: "payload too large",
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
