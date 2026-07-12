export const siteName = "TokenRank";
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://tokenrank.vercel.app").replace(
  /\/$/,
  "",
);
export const siteDescription =
  "TokenRank is a public leaderboard for aggregate AI coding token usage. It never uploads prompts, source code, chats, filenames, or file contents.";
export const siteDescriptionZh =
  "TokenRank 是公开 X 身份的 AI Coding Token 聚合用量排行榜，不上传 prompt、源码、对话、文件名或文件内容。";

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
