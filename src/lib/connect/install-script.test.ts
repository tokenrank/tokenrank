import { describe, expect, it } from "vitest";

import { buildInstallScript, buildWindowsInstallScript } from "./install-script";

describe("buildInstallScript", () => {
  it("installs the collector into a local bin path from the TokenRank hosted source", () => {
    const script = buildInstallScript();

    expect(script).toContain("https://tokenrank.vercel.app/tokenrank.mjs");
    expect(script).toContain("https://tokenrank.vercel.app/tokenrank-package.json");
    expect(script).not.toContain("raw.githubusercontent.com");
    expect(script).toContain("${HOME}/.tokenrank");
    expect(script).toContain("${HOME}/.local/bin");
    expect(script).toContain("${bin_dir}/tokenrank");
    expect(script).toContain('"${bin_dir}/tokenrank" tools');
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

    expect(script).toContain("https://tokenrank.vercel.app/tokenrank.mjs");
    expect(script).toContain("https://tokenrank.vercel.app/tokenrank-package.json");
    expect(script).not.toContain("raw.githubusercontent.com");
    expect(script).toContain("$env:USERPROFILE");
    expect(script).toContain("tokenrank.cmd");
    expect(script).toContain("Invoke-WebRequest");
    expect(script).toContain("& $cmdPath tools");
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
