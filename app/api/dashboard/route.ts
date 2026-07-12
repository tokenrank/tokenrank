import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/src/auth/config";
import { getUserSettings, getUserUploadStatus, updateUserSettings } from "@/src/lib/users";

const settingsSchema = z
  .object({
    profilePublic: z.boolean().optional(),
    rankingEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.profilePublic !== undefined || value.rankingEnabled !== undefined);

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ status: -1, error: "unauthorized" }, { status: 401 });
    }

    const user = await getUserSettings(session.user.id);

    if (!user) {
      return NextResponse.json({ status: -1, error: "user not found" }, { status: 404 });
    }

    const upload = await getUserUploadStatus(session.user.id);

    return NextResponse.json({ status: 0, user, upload });
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ status: -1, error: "unauthorized" }, { status: 401 });
    }

    const input = settingsSchema.parse(await request.json());
    const user = await updateUserSettings(session.user.id, input);

    if (!user) {
      return NextResponse.json({ status: -1, error: "user not found" }, { status: 404 });
    }

    return NextResponse.json({ status: 0, user });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ status: -1, error: "invalid payload" }, { status: 400 });
    }

    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}
