const cliSourceUrl = "https://raw.githubusercontent.com/BOS1980/tokenrank/main/bin/tokenrank.mjs";
const packageSourceUrl = "https://raw.githubusercontent.com/BOS1980/tokenrank/main/package.json";

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
