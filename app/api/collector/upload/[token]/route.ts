import { NextResponse } from "next/server";

import {
  parseUploadPayload,
  isV2UploadPayload,
  hashUploadEntries,
  toUploadSyncOptions,
  type ParsedUploadPayload,
} from "@/src/lib/collector/upload";
import {
  authenticateUploadToken,
  upsertUploadedUsage,
  type AuthenticatedUploadToken,
} from "@/src/lib/users";
import { hashSecret } from "@/src/lib/security/tokens";

const MAX_UPLOAD_BODY_BYTES = 512 * 1024;
const collectorTokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

class PayloadTooLargeError extends Error {}

function isCollectorToken(token: string): boolean {
  return collectorTokenPattern.test(token);
}

function accountIdentity(userId: string): string {
  return hashSecret(`collector-account:${userId}`);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!isCollectorToken(token)) {
    return NextResponse.json({ status: -1, error: "invalid token" }, { status: 401 });
  }

  try {
    const authenticatedWebhook = await authenticateUploadToken(token);
    if (!authenticatedWebhook) {
      return NextResponse.json({ status: -1, error: "invalid token" }, { status: 401 });
    }

    return NextResponse.json(
      {
        status: 0,
        accountId: accountIdentity(authenticatedWebhook.userId),
      },
      {
        headers: {
          "cache-control": "private, no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}

async function readJsonWithLimit(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");

  if (contentLength && Number(contentLength) > MAX_UPLOAD_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError("empty request body");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    received += value.byteLength;

    if (received > MAX_UPLOAD_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  let payload: ParsedUploadPayload;
  let authenticatedWebhook: AuthenticatedUploadToken | null;

  if (!isCollectorToken(token)) {
    return NextResponse.json({ status: -1, error: "invalid token" }, { status: 401 });
  }

  try {
    authenticatedWebhook = await authenticateUploadToken(token);
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }

  if (!authenticatedWebhook) {
    return NextResponse.json({ status: -1, error: "invalid token" }, { status: 401 });
  }

  try {
    const body = await readJsonWithLimit(request);
    payload = parseUploadPayload(body);

    if (
      isV2UploadPayload(payload) &&
      payload.syncMode === "full" &&
      (await hashUploadEntries(payload.entries)) !== payload.batchHash
    ) {
      return NextResponse.json({ status: -1, error: "invalid batch hash" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ status: -1, error: "payload too large" }, { status: 413 });
    }

    return NextResponse.json({ status: -1, error: "invalid payload" }, { status: 400 });
  }

  try {
    const result = isV2UploadPayload(payload)
      ? await upsertUploadedUsage(
          token,
          payload.deviceId,
          payload.entries,
          toUploadSyncOptions(payload),
          authenticatedWebhook,
        )
      : await upsertUploadedUsage(
          token,
          payload.deviceId,
          payload.entries,
          undefined,
          authenticatedWebhook,
        );

    if (!result.ok) {
      if (result.status === 409 && result.error === "cutover_date_conflict") {
        return NextResponse.json(
          {
            status: -1,
            error: "CUTOVER_DATE_CONFLICT",
            expectedCutoverDate: result.expectedCutoverDate,
            revision: result.revision,
          },
          { status: 409 },
        );
      }

      if (result.status === 409 && result.error === "active_snapshot_conflict") {
        return NextResponse.json(
          {
            status: -1,
            error: "ACTIVE_SNAPSHOT_CONFLICT",
            activeSnapshotId: result.activeSnapshotId,
            expectedCutoverDate: result.expectedCutoverDate,
            revision: result.revision,
          },
          { status: 409 },
        );
      }

      const error =
        result.status === 409
          ? result.error === "upgrade_required"
            ? "collector upgrade required"
            : result.error === "cutover_required"
              ? "full snapshot required"
              : result.error === "device_limit"
                ? "device limit reached"
                : "snapshot conflict"
          : "invalid token";
      return NextResponse.json({ status: -1, error }, { status: result.status });
    }

    return NextResponse.json({
      status: 0,
      uploaded: result.uploaded,
      committed: result.committed,
      revision: result.revision,
    });
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}
