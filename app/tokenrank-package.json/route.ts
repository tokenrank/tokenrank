import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const source = await readFile(path.join(process.cwd(), "package.json"), "utf8");

  return new Response(source, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "application/json; charset=utf-8",
    },
  });
}
