import { NextResponse } from "next/server";

import {
  parseUploadPayload,
  type ParsedUploadPayload,
} from "@/src/lib/collector/upload";
import { upsertUploadedUsage } from "@/src/lib/users";

const MAX_UPLOAD_BODY_BYTES = 512 * 1024;
const collectorTokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

class PayloadTooLargeError extends Error {}

function isCollectorToken(token: string): boolean {
  return collectorTokenPattern.test(token);
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

  if (!isCollectorToken(token)) {
    return NextResponse.json({ status: -1, error: "invalid token" }, { status: 401 });
  }

  try {
    const body = await readJsonWithLimit(request);
    payload = parseUploadPayload(body);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ status: -1, error: "payload too large" }, { status: 413 });
    }

    return NextResponse.json({ status: -1, error: "invalid payload" }, { status: 400 });
  }

  try {
    const result = await upsertUploadedUsage(token, payload.deviceId, payload.entries);

    if (!result.ok) {
      return NextResponse.json({ status: -1, error: "invalid token" }, { status: result.status });
    }

    return NextResponse.json({ status: 0, uploaded: result.uploaded });
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}
