import { NextResponse } from "next/server";

import { auth } from "@/src/auth/config";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ status: -1, error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ status: 0, user: session.user });
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}
