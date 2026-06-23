import { NextResponse } from "next/server";

import { getProfile } from "@/src/lib/users";

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  try {
    const { handle } = await params;
    const profile = await getProfile(handle);

    if (!profile) {
      return NextResponse.json({ status: -1, error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ status: 0, ...profile });
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}
