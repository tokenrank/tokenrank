export const CLI_REPOSITORY_URL = "https://github.com/tokenrank/tokenrank-cli";

export const CLI_RELEASE_BASE_URL = `${CLI_REPOSITORY_URL}/releases/latest/download`;

export const CLI_RELEASE_ASSETS = {
  cli: `${CLI_RELEASE_BASE_URL}/tokenrank.mjs`,
  packageJson: `${CLI_RELEASE_BASE_URL}/package.json`,
  unixInstaller: `${CLI_RELEASE_BASE_URL}/install.sh`,
  windowsInstaller: `${CLI_RELEASE_BASE_URL}/install.ps1`,
} as const;
