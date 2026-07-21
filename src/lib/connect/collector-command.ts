export type CollectorCommands = {
  unix: string;
  windows: string;
  npm: string;
  unixManual: string;
  windowsManual: string;
  npmManual: string;
};

const agentSkillUrl = "https://tokenrank.org/skill.md";

export function buildAgentPrompt(webhookUrl: string): string {
  const collectorToken = getCollectorToken(webhookUrl);
  return `Follow the instructions at ${agentSkillUrl} to connect this machine to TokenRank using this private setup token: ${collectorToken}`;
}

export function buildPreviewAgentPrompt(): string {
  return `Follow the instructions at ${agentSkillUrl} to preview this machine's aggregate AI usage locally without connecting an account or uploading data.`;
}

export function buildCollectorCommand(webhookUrl: string): string {
  return buildCollectorCommands(webhookUrl).unix;
}

export function buildCollectorCommands(webhookUrl: string): CollectorCommands {
  const appOrigin = getAppOrigin(webhookUrl);
  const collectorToken = getCollectorToken(webhookUrl);
  const tokenQuery = `token=${encodeURIComponent(collectorToken)}`;
  const unixTokenrankBin = '"${HOME}/.tokenrank/bin/tokenrank"';
  const windowsTokenrankBin = '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd"';
  const windowsGuard = "if ($LASTEXITCODE) { exit $LASTEXITCODE }";

  return {
    unix: `curl -fsSL "${appOrigin}/install.sh?${tokenQuery}" | bash`,
    windows: `irm "${appOrigin}/install.ps1?${tokenQuery}" | iex`,
    npm: [
      "npm install --global tokenrank",
      `tokenrank connect ${JSON.stringify(webhookUrl)}`,
      "tokenrank upload",
      "tokenrank service install",
    ].join(" && "),
    unixManual: [
      `${unixTokenrankBin} preview`,
      `${unixTokenrankBin} upload`,
    ].join(" && "),
    windowsManual: [
      `${windowsTokenrankBin} preview`,
      windowsGuard,
      `${windowsTokenrankBin} upload`,
    ].join("; "),
    npmManual: "tokenrank preview && tokenrank upload",
  };
}

function getAppOrigin(webhookUrl: string): string {
  return new URL(webhookUrl).origin;
}

function getCollectorToken(webhookUrl: string): string {
  const token = new URL(webhookUrl).pathname.split("/").filter(Boolean).at(-1);

  if (!token) {
    throw new Error("webhook URL 缺少 collector token。");
  }

  return token;
}
