import { NextResponse } from "next/server";

import { getLeaderboard } from "@/src/lib/users";
import { BOARD_KEYS, RANGE_KEYS, type BoardKey, type RangeKey } from "@/src/lib/types";

function isBoardKey(value: string): value is BoardKey {
  return (BOARD_KEYS as readonly string[]).includes(value);
}

function isRangeKey(value: string): value is RangeKey {
  return (RANGE_KEYS as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const board = url.searchParams.get("board") ?? "total";
  const range = url.searchParams.get("range") ?? "today";

  if (!isBoardKey(board) || !isRangeKey(range)) {
    return NextResponse.json({ status: -1, error: "invalid board or range" }, { status: 400 });
  }

  try {
    const entries = await getLeaderboard(board, range);

    return NextResponse.json({ status: 0, board, range, entries });
  } catch {
    return NextResponse.json({ status: -1, error: "server error" }, { status: 500 });
  }
}
