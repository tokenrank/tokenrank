import { buildWindowsInstallScript } from "@/src/lib/connect/install-script";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildWindowsInstallScript(), {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "text/x-powershell; charset=utf-8",
    },
  });
}
