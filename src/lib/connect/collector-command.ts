export type CollectorCommands = {
  unix: string;
  windows: string;
  unixManual: string;
  windowsManual: string;
};

const DEFAULT_COLLECTOR_INTERVAL_SECONDS = 12 * 60 * 60;

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
      `${unixTokenrankBin} service install --interval ${DEFAULT_COLLECTOR_INTERVAL_SECONDS}`,
    ].join("\n"),
    windows: [
      `irm "${appOrigin}/install.ps1" | iex`,
      `${windowsTokenrankBin} connect "${webhookUrl}"`,
      `${windowsTokenrankBin} service install --interval ${DEFAULT_COLLECTOR_INTERVAL_SECONDS}`,
    ].join("\n"),
    unixManual: [
      `${unixTokenrankBin} preview`,
      `${unixTokenrankBin} upload`,
    ].join("\n"),
    windowsManual: [
      `${windowsTokenrankBin} preview`,
      `${windowsTokenrankBin} upload`,
    ].join("\n"),
  };
}

function getAppOrigin(webhookUrl: string): string {
  return new URL(webhookUrl).origin;
}
