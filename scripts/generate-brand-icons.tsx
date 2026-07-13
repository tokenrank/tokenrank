import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ImageResponse } from "next/og";

const output = [
  { path: "app/apple-icon.png", size: 180 },
  { path: "public/icon-192.png", size: 192 },
  { path: "public/icon-512.png", size: 512 },
  { path: "public/icon-maskable-512.png", size: 512 },
] as const;

async function main() {
  for (const asset of output) {
    await writeFile(resolve(asset.path), await renderIcon(asset.size));
  }

  const faviconPng = await renderIcon(48);
  await writeFile(resolve("public/favicon.ico"), createIco(faviconPng, 48));
}

async function renderIcon(size: number): Promise<Buffer> {
  const response = new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#070907",
          borderRadius: Math.round(size * 0.14),
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ff5b35",
            height: "62.5%",
            left: "20.3125%",
            position: "absolute",
            top: "21.875%",
            width: "62.5%",
          }}
        />
        <div
          style={{
            alignItems: "center",
            background: "#d6ff3f",
            display: "flex",
            height: "62.5%",
            justifyContent: "center",
            left: "15.625%",
            position: "absolute",
            top: "15.625%",
            width: "62.5%",
          }}
        >
          <svg height="100%" viewBox="0 0 48 48" width="100%">
            <path d="M8 9h25v7H8zM15 20h25v7H15zM22 31h18v7H22z" fill="#080b07" />
            <path d="m8 34 10-10v20H8Z" fill="#080b07" />
          </svg>
        </div>
      </div>
    ),
    { height: size, width: size },
  );

  return Buffer.from(await response.arrayBuffer());
}

function createIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size === 256 ? 0 : size, 6);
  header.writeUInt8(size === 256 ? 0 : size, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
