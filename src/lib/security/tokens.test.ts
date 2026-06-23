import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createWebhookSecret, hashSecret, timingSafeEqualText } from "./tokens";

describe("webhook token helpers", () => {
  it("creates long URL-safe secrets", () => {
    const secret = createWebhookSecret();

    expect(secret.length).toBeGreaterThanOrEqual(43);
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes secrets deterministically without returning the original", () => {
    const secret = "sample_secret_123";

    expect(hashSecret(secret)).toBe(hashSecret(secret));
    expect(hashSecret(secret)).not.toBe(secret);
  });

  it("compares text safely", () => {
    expect(timingSafeEqualText("abc", "abc")).toBe(true);
    expect(timingSafeEqualText("abc", "abd")).toBe(false);
    expect(timingSafeEqualText("abc", "abcd")).toBe(false);
  });

  it("compares fixed-length digests instead of raw input buffers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/security/tokens.ts"), "utf8");
    const timingSafeEqualTextSource =
      source.match(/export function timingSafeEqualText[\s\S]*?\n}/)?.[0] ?? "";

    expect(timingSafeEqualTextSource).toContain(".digest()");
    expect(timingSafeEqualTextSource).toContain("timingSafeEqual(left, right)");
    expect(timingSafeEqualTextSource).not.toContain(".length");
  });
});
