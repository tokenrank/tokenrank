import { describe, expect, it } from "vitest";

import { buildInstallScript, buildWindowsInstallScript } from "./install-script";

describe("buildInstallScript", () => {
  it("installs the collector into a local bin path from the public GitHub source", () => {
    const script = buildInstallScript();

    expect(script).toContain("https://raw.githubusercontent.com/BOS1980/tokenrank/main/bin/tokenrank.mjs");
    expect(script).toContain("${HOME}/.tokenrank");
    expect(script).toContain("${HOME}/.local/bin");
    expect(script).toContain("${bin_dir}/tokenrank");
    expect(script).toContain('"${bin_dir}/tokenrank" tools');
  });

  it("installs the collector on Windows with a PowerShell script", () => {
    const script = buildWindowsInstallScript();

    expect(script).toContain("https://raw.githubusercontent.com/BOS1980/tokenrank/main/bin/tokenrank.mjs");
    expect(script).toContain("$env:USERPROFILE");
    expect(script).toContain("tokenrank.cmd");
    expect(script).toContain("Invoke-WebRequest");
    expect(script).toContain("& $cmdPath tools");
  });
});
