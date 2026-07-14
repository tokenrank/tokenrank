import { describe, expect, it } from "vitest";

import { buildInstallScript, buildWindowsInstallScript } from "./install-script";

describe("buildInstallScript", () => {
  it("installs the collector into a local bin path from the TokenRank hosted source", () => {
    const script = buildInstallScript();

    expect(script).toContain("https://tokenrank.org/tokenrank.mjs");
    expect(script).toContain("https://tokenrank.org/tokenrank-package.json");
    expect(script).not.toContain("raw.githubusercontent.com");
    expect(script).toContain("${HOME}/.tokenrank");
    expect(script).toContain("${install_dir}/bin");
    expect(script).not.toContain("${HOME}/.local/bin");
    expect(script).toContain("${bin_dir}/tokenrank");
    expect(script).toContain('"${bin_dir}/tokenrank" tools');
  });

  it("fails with an actionable message when the Unix install directories are not writable", () => {
    const script = buildInstallScript();

    expect(script).toContain('if ! mkdir -p "${install_dir}" "${bin_dir}" 2>/dev/null; then');
    expect(script).toContain('[[ ! -w "${install_dir}" || ! -w "${bin_dir}" ]]');
    expect(script).toContain("Set TOKENRANK_HOME and TOKENRANK_BIN_DIR");
  });

  it("can install, connect, upload, and enable the collector from one shell script", () => {
    const script = buildInstallScript({
      appOrigin: "https://tokenrank.test",
      webhookUrl: "https://tokenrank.test/api/collector/upload/abc123",
    });

    expect(script).toContain("https://tokenrank.test/tokenrank.mjs");
    expect(script).toContain("webhook_url='https://tokenrank.test/api/collector/upload/abc123'");
    expect(script).toContain('TOKENRANK_NO_LOGO=1 "${bin_dir}/tokenrank" connect "${webhook_url}"');
    expect(script).toContain('"${bin_dir}/tokenrank" upload');
    expect(script).toContain('TOKENRANK_NO_LOGO=1 "${bin_dir}/tokenrank" service install');
    expect(script).not.toContain('"${bin_dir}/tokenrank" tools');
  });

  it("installs the collector on Windows with a PowerShell script", () => {
    const script = buildWindowsInstallScript();

    expect(script).toContain("https://tokenrank.org/tokenrank.mjs");
    expect(script).toContain("https://tokenrank.org/tokenrank-package.json");
    expect(script).not.toContain("raw.githubusercontent.com");
    expect(script).toContain("$env:USERPROFILE");
    expect(script).toContain("tokenrank.cmd");
    expect(script).toContain("Invoke-WebRequest");
    expect(script).toContain("& $cmdPath tools");
  });

  it("adds the Windows install directory to the current and future user PATH without duplicates", () => {
    const script = buildWindowsInstallScript();

    expect(script).toContain('[Environment]::GetEnvironmentVariable("Path", "User")');
    expect(script).toContain('[Environment]::SetEnvironmentVariable("Path", $updatedUserPath, "User")');
    expect(script).toContain('$env:Path = "$processPath;$installDir"');
    expect(script).toContain('$normalizedUserPathEntries -notcontains $normalizedInstallDir');
    expect(script).toContain('$normalizedProcessPathEntries -notcontains $normalizedInstallDir');
    expect(script.indexOf('[Environment]::SetEnvironmentVariable("Path"')).toBeLessThan(
      script.indexOf("& $cmdPath tools"),
    );
  });

  it("can install, connect, upload, and enable the collector from one PowerShell script", () => {
    const script = buildWindowsInstallScript({
      appOrigin: "https://tokenrank.test",
      webhookUrl: "https://tokenrank.test/api/collector/upload/abc123",
    });

    expect(script).toContain("https://tokenrank.test/tokenrank.mjs");
    expect(script).toContain("$webhookUrl = 'https://tokenrank.test/api/collector/upload/abc123'");
    expect(script).toContain('$env:TOKENRANK_NO_LOGO = "1"');
    expect(script).toContain("& $cmdPath connect $webhookUrl");
    expect(script).toContain("& $cmdPath upload");
    expect(script).toContain("& $cmdPath service install");
    expect(script).toContain("if ($LASTEXITCODE) { exit $LASTEXITCODE }");
    expect(script).not.toContain("& $cmdPath tools");
  });
});
