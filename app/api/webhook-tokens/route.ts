import { NextResponse } from "next/server";

import { auth } from "@/src/auth/config";
import { webhookTokens } from "@/src/db/schema";
import { createWebhookSecret, hashSecret } from "@/src/lib/security/tokens";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ status: -1, error: "unauthorized" }, { status: 401 });
    }

    const secret = createWebhookSecret();
    const { db } = await import("@/src/db/client");

    await db.insert(webhookTokens).values({
      userId: session.user.id,
      tokenHash: hashSecret(secret),
      label: "default",
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

    return NextResponse.json({
      status: 0,
      webhookUrl: `${appUrl}/api/collector/upload/${secret}`,
    });
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}
