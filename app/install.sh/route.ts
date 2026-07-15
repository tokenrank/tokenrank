import { buildInstallScript } from "@/src/lib/connect/install-script";

export const dynamic = "force-dynamic";

const collectorTokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    url.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    url.protocol.replace(/:$/, "");

  return `${protocol}://${host}`;
}

function webhookUrlFromRequest(request: Request, origin: string): string | undefined {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return undefined;
  }

  if (!collectorTokenPattern.test(token)) {
    return undefined;
  }

  return new URL(`/api/collector/upload/${token}`, origin).toString();
}

export function GET(request: Request) {
  const origin = requestOrigin(request);
  const webhookUrl = webhookUrlFromRequest(request, origin);

  return new Response(buildInstallScript({ webhookUrl }), {
    headers: {
      "cache-control": webhookUrl ? "private, no-store" : "public, max-age=300",
      "content-type": "text/x-shellscript; charset=utf-8",
    },
  });
}
