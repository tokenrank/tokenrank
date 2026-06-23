export type CollectorCommands = {
  unix: string;
  windows: string;
};

export function buildCollectorCommand(webhookUrl: string): string {
  return buildCollectorCommands(webhookUrl).unix;
}

export function buildCollectorCommands(webhookUrl: string): CollectorCommands {
  const appOrigin = getAppOrigin(webhookUrl);
  const unixTokenrankBin = '"${HOME}/.local/bin/tokenrank"';
  const windowsTokenrankBin = '& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd"';

  return {
    unix: [
      `curl -fsSL "${appOrigin}/install.sh" | bash`,
      `${unixTokenrankBin} connect "${webhookUrl}"`,
      `${unixTokenrankBin} preview`,
      `${unixTokenrankBin} upload`,
    ].join("\n"),
    windows: [
      `irm "${appOrigin}/install.ps1" | iex`,
      `${windowsTokenrankBin} connect "${webhookUrl}"`,
      `${windowsTokenrankBin} preview`,
      `${windowsTokenrankBin} upload`,
    ].join("\n"),
  };
}

function getAppOrigin(webhookUrl: string): string {
  return new URL(webhookUrl).origin;
}
