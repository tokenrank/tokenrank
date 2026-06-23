import { describe, expect, it } from "vitest";
import { sanitizePublicUser } from "./users";

describe("sanitizePublicUser", () => {
  it("returns public profile fields without private auth fields", () => {
    const user = sanitizePublicUser({
      id: "user-1",
      name: "Private Auth Name",
      email: "alice@example.com",
      emailVerified: new Date("2026-06-22T00:00:00.000Z"),
      image: "https://example.com/private.jpg",
      xId: "123456",
      xHandle: "alice",
      displayName: "Alice Public",
      avatarUrl: "https://example.com/avatar.jpg",
      profilePublic: true,
      rankingEnabled: true,
      createdAt: new Date("2026-06-22T00:00:00.000Z"),
      updatedAt: new Date("2026-06-22T00:00:00.000Z"),
    });

    expect(user).toEqual({
      id: "user-1",
      handle: "alice",
      name: "Alice Public",
      avatarUrl: "https://example.com/avatar.jpg",
      profilePublic: true,
      rankingEnabled: true,
    });
    expect(user).not.toHaveProperty("email");
    expect(user).not.toHaveProperty("emailVerified");
  });
});
