export const siteName = "TokenRank";
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://tokenrank.vercel.app").replace(
  /\/$/,
  "",
);
export const siteDescription =
  "TokenRank ranks people putting AI to work by aggregate token usage across supported agents and AI tools. It never uploads prompts, source code, chats, filenames, or file contents.";
export const siteDescriptionZh =
  "TokenRank 展示真正把 AI 用进工作的人在 Agent 与 AI 工具中的聚合 Token 用量排行，不上传 prompt、源码、对话、文件名或文件内容。";

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
