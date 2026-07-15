import { describe, expect, it } from "vitest";

import { CLI_RELEASE_ASSETS } from "./cli-release";
import { buildInstallScript, buildWindowsInstallScript } from "./install-script";

describe("CLI release bootstrap scripts", () => {
  it("delegates generic Unix installation to the standalone CLI release", () => {
    const script = buildInstallScript();

    expect(script).toContain(CLI_RELEASE_ASSETS.unixInstaller);
    expect(script).not.toContain("tokenrank.mjs");
    expect(script).not.toContain("mkdir -p");
    expect(script).not.toContain("TOKENRANK_WEBHOOK_URL");
  });

  it("passes the private webhook to the standalone Unix installer", () => {
    const script = buildInstallScript({
      webhookUrl: "https://tokenrank.test/api/collector/upload/abc123",
    });

    expect(script).toContain(
      "export TOKENRANK_WEBHOOK_URL='https://tokenrank.test/api/collector/upload/abc123'",
    );
    expect(script).toContain(CLI_RELEASE_ASSETS.unixInstaller);
  });

  it("delegates generic Windows installation to the standalone CLI release", () => {
    const script = buildWindowsInstallScript();

    expect(script).toContain(CLI_RELEASE_ASSETS.windowsInstaller);
    expect(script).not.toContain("tokenrank.mjs");
    expect(script).not.toContain("Invoke-WebRequest");
    expect(script).not.toContain("TOKENRANK_WEBHOOK_URL");
  });

  it("passes and restores the private webhook around the Windows installer", () => {
    const script = buildWindowsInstallScript({
      webhookUrl: "https://tokenrank.test/api/collector/upload/abc123",
    });

    expect(script).toContain(
      "$env:TOKENRANK_WEBHOOK_URL = 'https://tokenrank.test/api/collector/upload/abc123'",
    );
    expect(script).toContain("$previousTokenrankWebhookUrl");
    expect(script).toContain("Remove-Item Env:TOKENRANK_WEBHOOK_URL");
    expect(script).toContain(CLI_RELEASE_ASSETS.windowsInstaller);
  });
});
