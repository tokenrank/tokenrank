export function buildCollectorCommand(webhookUrl: string): string {
  const appOrigin = getAppOrigin(webhookUrl);
  const tokenrankBin = '"${HOME}/.local/bin/tokenrank"';

  return [
    `curl -fsSL "${appOrigin}/install.sh" | bash`,
    `${tokenrankBin} connect "${webhookUrl}"`,
    `${tokenrankBin} preview`,
    `${tokenrankBin} upload`,
  ].join("\n");
}

function getAppOrigin(webhookUrl: string): string {
  return new URL(webhookUrl).origin;
}
