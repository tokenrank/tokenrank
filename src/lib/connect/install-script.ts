import { siteUrl } from "../site";

const appUrl = siteUrl;

type InstallScriptOptions = {
  appOrigin?: string;
  webhookUrl?: string;
};

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function powershellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sourceUrls(appOrigin = appUrl) {
  const origin = appOrigin.replace(/\/$/, "");

  return {
    cliSourceUrl: `${origin}/tokenrank.mjs`,
    packageSourceUrl: `${origin}/tokenrank-package.json`,
  };
}

export function buildInstallScript(options: InstallScriptOptions = {}): string {
  const { cliSourceUrl, packageSourceUrl } = sourceUrls(options.appOrigin);
  const webhookFlow = options.webhookUrl
    ? `
webhook_url=${shellSingleQuote(options.webhookUrl)}
TOKENRANK_NO_LOGO=1 "${"${bin_dir}"}/tokenrank" connect "${"${webhook_url}"}"
"${"${bin_dir}"}/tokenrank" upload
TOKENRANK_NO_LOGO=1 "${"${bin_dir}"}/tokenrank" service install
`
    : `
"${"${bin_dir}"}/tokenrank" tools
`;

  return `#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "TokenRank requires Node.js. Install Node.js first: https://nodejs.org/"
  exit 1
fi

install_dir="\${TOKENRANK_HOME:-\${HOME}/.tokenrank}"
bin_dir="\${TOKENRANK_BIN_DIR:-\${HOME}/.local/bin}"

mkdir -p "\${install_dir}" "\${bin_dir}"

curl -fsSL "${cliSourceUrl}" -o "\${install_dir}/tokenrank.mjs"
curl -fsSL "${packageSourceUrl}" -o "\${install_dir}/package.json"
chmod +x "\${install_dir}/tokenrank.mjs"
ln -sf "\${install_dir}/tokenrank.mjs" "\${bin_dir}/tokenrank"

echo "TokenRank collector installed: \${bin_dir}/tokenrank"
if ! command -v tokenrank >/dev/null 2>&1; then
  echo "Add this to your shell PATH if tokenrank is not found:"
  echo "  export PATH=\\"\\$HOME/.local/bin:\\$PATH\\""
fi
${webhookFlow}`;
}

export function buildWindowsInstallScript(options: InstallScriptOptions = {}): string {
  const { cliSourceUrl, packageSourceUrl } = sourceUrls(options.appOrigin);
  const webhookFlow = options.webhookUrl
    ? `
$webhookUrl = ${powershellSingleQuote(options.webhookUrl)}
$previousTokenrankNoLogo = $env:TOKENRANK_NO_LOGO
$env:TOKENRANK_NO_LOGO = "1"
& $cmdPath connect $webhookUrl
if ($LASTEXITCODE) { exit $LASTEXITCODE }
if ($null -eq $previousTokenrankNoLogo) { Remove-Item Env:TOKENRANK_NO_LOGO -ErrorAction SilentlyContinue } else { $env:TOKENRANK_NO_LOGO = $previousTokenrankNoLogo }
& $cmdPath upload
if ($LASTEXITCODE) { exit $LASTEXITCODE }
$env:TOKENRANK_NO_LOGO = "1"
& $cmdPath service install
if ($LASTEXITCODE) { exit $LASTEXITCODE }
if ($null -eq $previousTokenrankNoLogo) { Remove-Item Env:TOKENRANK_NO_LOGO -ErrorAction SilentlyContinue } else { $env:TOKENRANK_NO_LOGO = $previousTokenrankNoLogo }
`
    : `
& $cmdPath tools
if ($LASTEXITCODE) { exit $LASTEXITCODE }
`;

  return `$ErrorActionPreference = "Stop"
$global:LASTEXITCODE = 0

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "TokenRank requires Node.js. Install Node.js first: https://nodejs.org/"
  exit 1
}

$installDir = if ($env:TOKENRANK_HOME) { $env:TOKENRANK_HOME } else { Join-Path $env:USERPROFILE ".tokenrank" }
$cmdPath = Join-Path $installDir "tokenrank.cmd"

New-Item -ItemType Directory -Force -Path $installDir | Out-Null

Invoke-WebRequest -Uri "${cliSourceUrl}" -OutFile (Join-Path $installDir "tokenrank.mjs")
Invoke-WebRequest -Uri "${packageSourceUrl}" -OutFile (Join-Path $installDir "package.json")

$escapedCliPath = (Join-Path $installDir "tokenrank.mjs").Replace('"', '""')
$cmdContent = "@echo off\`r\`nnode \`"$escapedCliPath\`" %*\`r\`n"
Set-Content -Path $cmdPath -Value $cmdContent -Encoding ASCII

$normalizedInstallDir = $installDir.Trim().TrimEnd('\')
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$normalizedUserPathEntries = @(
  $userPath -split ";" |
    ForEach-Object { [Environment]::ExpandEnvironmentVariables($_).Trim().TrimEnd('\') } |
    Where-Object { $_ }
)
if ($normalizedUserPathEntries -notcontains $normalizedInstallDir) {
  $updatedUserPath = if ([string]::IsNullOrWhiteSpace($userPath)) {
    $installDir
  } else {
    "$($userPath.TrimEnd(';'));$installDir"
  }
  [Environment]::SetEnvironmentVariable("Path", $updatedUserPath, "User")
}

$processPath = $env:Path
$normalizedProcessPathEntries = @(
  $processPath -split ";" |
    ForEach-Object { $_.Trim().TrimEnd('\') } |
    Where-Object { $_ }
)
if ($normalizedProcessPathEntries -notcontains $normalizedInstallDir) {
  if ([string]::IsNullOrWhiteSpace($processPath)) {
    $env:Path = $installDir
  } else {
    $env:Path = "$processPath;$installDir"
  }
}

Write-Host "TokenRank collector installed: $cmdPath"
Write-Host "TokenRank command available: tokenrank"
${webhookFlow}`;
}
