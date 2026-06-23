export const RANGE_KEYS = ["today", "3d", "7d", "30d", "month"] as const;
export const TOOL_KEYS = [
  "codex",
  "claude-code",
  "hermes",
  "openclaw",
  "cline",
  "opencode",
  "workbuddy",
  "gemini",
  "zcode",
  "kimi",
  "kilo-code",
  "codex-vps",
  "roo-code",
  "qwen",
  "codex-cache",
] as const;
export const BOARD_KEYS = ["total", "cost", ...TOOL_KEYS] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];
export type BoardKey = (typeof BOARD_KEYS)[number];
export type ToolKey = (typeof TOOL_KEYS)[number];

export type TokenUsageEntry = {
  date: string;
  tool: ToolKey;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
};

export type UsageRow = {
  userId: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  deviceId: string;
  date: string;
  tool: ToolKey;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCostMicros: number;
  blocked?: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  estimatedCostMicros: number;
  byTool: Record<ToolKey, number>;
};
