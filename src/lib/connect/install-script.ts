const appUrl = "https://tokenrank.vercel.app";
const cliSourceUrl = `${appUrl}/tokenrank.mjs`;
const packageSourceUrl = `${appUrl}/tokenrank-package.json`;

export function buildInstallScript(): string {
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

"\${bin_dir}/tokenrank" tools
`;
}

export function buildWindowsInstallScript(): string {
  return `$ErrorActionPreference = "Stop"

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

Write-Host "TokenRank collector installed: $cmdPath"
& $cmdPath tools
`;
}
