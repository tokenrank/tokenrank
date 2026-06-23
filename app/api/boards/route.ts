import { NextResponse } from "next/server";

import { BOARD_KEYS, TOOL_KEYS } from "@/src/lib/types";

export async function GET() {
  return NextResponse.json({
    status: 0,
    boards: BOARD_KEYS,
    tools: TOOL_KEYS,
  });
}
