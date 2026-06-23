export function buildCollectorCommand(webhookUrl: string): string {
  return `tokenrank connect "${webhookUrl}" && tokenrank upload`;
}
