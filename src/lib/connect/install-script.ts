import { CLI_RELEASE_ASSETS } from "./cli-release";

type InstallScriptOptions = {
  webhookUrl?: string;
};

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function powershellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildInstallScript(options: InstallScriptOptions = {}): string {
  const webhookExport = options.webhookUrl
    ? `export TOKENRANK_WEBHOOK_URL=${shellSingleQuote(options.webhookUrl)}\n`
    : "";

  return `#!/usr/bin/env bash
set -euo pipefail

${webhookExport}curl -fsSL "${CLI_RELEASE_ASSETS.unixInstaller}" | bash
`;
}

export function buildWindowsInstallScript(options: InstallScriptOptions = {}): string {
  if (!options.webhookUrl) {
    return `$ErrorActionPreference = "Stop"
irm "${CLI_RELEASE_ASSETS.windowsInstaller}" | iex
`;
  }

  return `$ErrorActionPreference = "Stop"
$previousTokenrankWebhookUrl = $env:TOKENRANK_WEBHOOK_URL
try {
  $env:TOKENRANK_WEBHOOK_URL = ${powershellSingleQuote(options.webhookUrl)}
  irm "${CLI_RELEASE_ASSETS.windowsInstaller}" | iex
} finally {
  if ($null -eq $previousTokenrankWebhookUrl) {
    Remove-Item Env:TOKENRANK_WEBHOOK_URL -ErrorAction SilentlyContinue
  } else {
    $env:TOKENRANK_WEBHOOK_URL = $previousTokenrankWebhookUrl
  }
}
`;
}
