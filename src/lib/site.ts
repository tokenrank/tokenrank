export const siteName = "TokenRank";
export const githubRepositoryUrl = "https://github.com/tokenrank/tokenrank";
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://tokenrank.org").replace(
  /\/$/,
  "",
);
export const siteDescription =
  "Compare locally collected aggregate AI token activity across Codex, Claude Code, Gemini, Qwen, and more. Prompts, code, and chats stay local.";
export const siteDescriptionZh =
  "比较 Codex、Claude Code、Gemini、Qwen 等 AI 工具在本机采集的聚合 Token 活动；prompt、代码和对话留在本机。";

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
