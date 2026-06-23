import { BOARD_KEYS, RANGE_KEYS, type BoardKey, type RangeKey } from "../types";

type LeaderboardSearchParams = {
  board?: string;
  range?: string;
};

export function parseLeaderboardSearchParams(params: LeaderboardSearchParams): {
  board: BoardKey;
  range: RangeKey;
} {
  const board = isBoardKey(params.board) ? params.board : "total";
  const range = isRangeKey(params.range) ? params.range : "today";

  return { board, range };
}

function isBoardKey(value: string | undefined): value is BoardKey {
  return typeof value === "string" && (BOARD_KEYS as readonly string[]).includes(value);
}

function isRangeKey(value: string | undefined): value is RangeKey {
  return typeof value === "string" && (RANGE_KEYS as readonly string[]).includes(value);
}
