import { buildInstallScript } from "@/src/lib/connect/install-script";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildInstallScript(), {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "text/x-shellscript; charset=utf-8",
    },
  });
}
