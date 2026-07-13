export const siteName = "TokenRank";
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://tokenrank.org").replace(
  /\/$/,
  "",
);
export const siteDescription =
  "Compare aggregate AI token usage across Codex, Claude Code, Gemini, Qwen, and more. Join the public leaderboard without sharing prompts, code, or chats.";
export const siteDescriptionZh =
  "比较 Codex、Claude Code、Gemini、Qwen 等 AI 工具的聚合 Token 用量；公开上榜，但不上传 prompt、代码或对话。";

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
