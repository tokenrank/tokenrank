import { describe, expect, it } from "vitest";
import { POST } from "../../../app/api/collector/upload/[token]/route";

const context = {
  params: Promise.resolve({ token: "secret-token" }),
};

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
});
