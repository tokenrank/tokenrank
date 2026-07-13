import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pngAssets = [
  { path: "app/apple-icon.png", size: 180 },
  { path: "public/icon-192.png", size: 192 },
  { path: "public/icon-512.png", size: 512 },
  { path: "public/icon-maskable-512.png", size: 512 },
] as const;

describe("brand icon assets", () => {
  it.each(pngAssets)("ships $path at $size x $size", async ({ path, size }) => {
    const image = await readFile(resolve(path));

    expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(image.readUInt32BE(16)).toBe(size);
    expect(image.readUInt32BE(20)).toBe(size);
  });

  it("ships a real 48px TokenRank favicon instead of the placeholder", async () => {
    const favicon = await readFile(resolve("app/favicon.ico"));

    expect(favicon.subarray(0, 6).toString("hex")).toBe("000001000100");
    expect(favicon.readUInt8(6)).toBe(48);
    expect(favicon.readUInt8(7)).toBe(48);
    expect(favicon.subarray(22, 30).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("keeps SVG fallbacks aligned with the TokenRank brand palette", async () => {
    const [appIcon, favicon, pinnedTab] = await Promise.all([
      readFile(resolve("app/icon.svg"), "utf8"),
      readFile(resolve("public/favicon.svg"), "utf8"),
      readFile(resolve("public/safari-pinned-tab.svg"), "utf8"),
    ]);

    expect(appIcon).toContain("#d6ff3f");
    expect(appIcon).toContain("#ff5b35");
    expect(favicon).toContain("#d6ff3f");
    expect(pinnedTab).toContain("viewBox=\"0 0 48 48\"");
  });
});
