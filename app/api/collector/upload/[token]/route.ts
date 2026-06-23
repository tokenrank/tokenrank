import { NextResponse } from "next/server";

import {
  parseUploadPayload,
  type ParsedUploadPayload,
} from "@/src/lib/collector/upload";
import { upsertUploadedUsage } from "@/src/lib/users";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  let payload: ParsedUploadPayload;

  try {
    const body = await request.json();
    payload = parseUploadPayload(body);
  } catch {
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
