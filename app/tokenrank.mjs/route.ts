import { CLI_RELEASE_ASSETS } from "@/src/lib/connect/cli-release";

export const dynamic = "force-static";

export function GET() {
  return Response.redirect(CLI_RELEASE_ASSETS.cli, 307);
}
