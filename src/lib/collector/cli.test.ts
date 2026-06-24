import { createServer, type IncomingMessage } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { connect as connectSocket } from "node:net";
import { access, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { TOOL_KEYS } from "../types";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("bin/tokenrank.mjs");

async function runCli(args: string[], home: string, extraEnv: NodeJS.ProcessEnv = {}) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    env: { ...process.env, HOME: home, TOKENRANK_SERVICE_NO_REGISTER: "1", ...extraEnv },
  });
}

async function tempHome() {
  return mkdtemp(path.join(tmpdir(), "tokenrank-cli-"));
}

const sourceFixturePaths = {
  codex: ".codex/archived_sessions/codex.jsonl",
  "claude-code": ".claude/projects/demo/claude.jsonl",
  hermes: ".hermes/sessions/hermes.jsonl",
  openclaw: ".openclaw/agents/openclaw.jsonl",
  cline: "Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks/cline.json",
  opencode: ".local/share/opencode/sessions/opencode.jsonl",
  workbuddy: ".workbuddy/traces/workbuddy.jsonl",
  gemini: ".gemini/tmp/boss/chats/gemini.json",
  zcode: ".zcode/sessions/zcode.jsonl",
  kimi: ".kimi/sessions/kimi.jsonl",
  "kilo-code": "Library/Application Support/Code/User/globalStorage/kilocode.kilo-code/tasks/kilo.json",
  "codex-vps": ".codex-vps/sessions/codex-vps.jsonl",
  "roo-code": "Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/tasks/roo.json",
  qwen: ".qwen/sessions/qwen.jsonl",
  "codex-cache": ".codex/cache/session/codex-cache.jsonl",
} as const satisfies Record<(typeof TOOL_KEYS)[number], string>;

function expectedFixtureTotal(tool: (typeof TOOL_KEYS)[number]) {
  return tool === "codex" ? 3 : 10;
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function withUploadServer<T>(
  handler: (payload: unknown) => void | Promise<void>,
  callback: (webhookUrl: string) => Promise<T>,
) {
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request);
    await handler(JSON.parse(body));
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: 0, uploaded: 1 }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("test server did not bind to a TCP port");
    }

    return await callback(`http://127.0.0.1:${address.port}/api/collector/upload/test-token`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function withProxyUploadServer<T>(
  handler: (payload: unknown, requestUrl: string | undefined) => void | Promise<void>,
  callback: (proxyUrl: string) => Promise<T>,
) {
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request);
    await handler(JSON.parse(body), request.url);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: 0, uploaded: 1 }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("test proxy did not bind to a TCP port");
    }

    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function createSelfSignedCertificate(home: string) {
  const keyPath = path.join(home, "localhost.key");
  const certPath = path.join(home, "localhost.crt");

  await execFileAsync("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-subj",
    "/CN=tokenrank.invalid",
    "-days",
    "1",
  ]);

  return {
    key: await readFile(keyPath),
    cert: await readFile(certPath),
  };
}

async function withHttpsUploadProxy<T>(
  home: string,
  handler: (payload: unknown) => void | Promise<void>,
  callback: (proxyUrl: string, getTunnelTarget: () => string | undefined) => Promise<T>,
) {
  const cert = await createSelfSignedCertificate(home);
  const uploadServer = createHttpsServer(cert, async (request, response) => {
    const body = await readRequestBody(request);
    await handler(JSON.parse(body));
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: 0, uploaded: 1 }));
  });

  await new Promise<void>((resolve) => uploadServer.listen(0, "127.0.0.1", resolve));

  const uploadAddress = uploadServer.address();

  if (!uploadAddress || typeof uploadAddress === "string") {
    throw new Error("test HTTPS server did not bind to a TCP port");
  }

  let tunnelTarget: string | undefined;
  const proxyServer = createServer();
  proxyServer.on("connect", (request, clientSocket, head) => {
    tunnelTarget = request.url;
    const upstream = connectSocket(uploadAddress.port, "127.0.0.1", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) {
        upstream.write(head);
      }
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.on("error", () => clientSocket.destroy());
    upstream.on("close", () => clientSocket.destroy());
    clientSocket.on("error", () => upstream.destroy());
    clientSocket.on("close", () => upstream.destroy());
  });

  await new Promise<void>((resolve) => proxyServer.listen(0, "127.0.0.1", resolve));

  try {
    const proxyAddress = proxyServer.address();

    if (!proxyAddress || typeof proxyAddress === "string") {
      throw new Error("test proxy did not bind to a TCP port");
    }

    return await callback(
      `http://127.0.0.1:${proxyAddress.port}`,
      () => tunnelTarget,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      proxyServer.close((error) => (error ? reject(error) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      uploadServer.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function writeJsonLog(home: string, relativePath: string, value: unknown) {
  const file = path.join(home, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  const body = relativePath.endsWith(".jsonl") ? `${JSON.stringify(value)}\n` : JSON.stringify(value);
  await writeFile(file, body);
}

async function writeSqliteUsage(home: string, relativePath: string) {
  const file = path.join(home, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await execFileAsync("sqlite3", [
    file,
    [
      "create table sessions (id text, model text, started_at integer, input_tokens integer, output_tokens integer, cache_read_tokens integer, cache_write_tokens integer);",
      "insert into sessions values ('row-1', 'sqlite-model', 1782201600, 7, 8, 9, 10);",
    ].join(" "),
  ]);
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeAllToolFixtures(home: string) {
  await Promise.all(
    TOOL_KEYS.map((tool) =>
      writeJsonLog(home, sourceFixturePaths[tool], {
        timestamp: "2026-06-23T08:00:00.000Z",
        model: `${tool}-model`,
        message: {
          usage: {
            input_tokens: 1,
            output_tokens: 2,
            cache_read_input_tokens: 3,
            cache_creation_input_tokens: 4,
          },
        },
        prompt: "must not appear in preview",
        content: "must not appear in preview",
      }),
    ),
  );
}

describe("tokenrank collector CLI", () => {
  it("lists every supported leaderboard tool", async () => {
    const home = await tempHome();
    const { stdout } = await runCli(["tools"], home);

    for (const tool of TOOL_KEYS) {
      expect(stdout).toContain(tool);
    }
  });

  it("stores the webhook URL in a private config file", async () => {
    const home = await tempHome();
    await runCli(["connect", "https://tokenrank.test/api/collector/upload/secret"], home);

    const configPath = path.join(home, ".tokenrank", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8")) as { webhookUrl: string };
    const mode = (await stat(configPath)).mode & 0o777;

    expect(config.webhookUrl).toBe("https://tokenrank.test/api/collector/upload/secret");
    expect(mode).toBe(0o600);
  });

  it("removes the saved webhook config on logout", async () => {
    const home = await tempHome();
    await runCli(["connect", "https://tokenrank.test/api/collector/upload/secret"], home);

    const configPath = path.join(home, ".tokenrank", "config.json");
    expect(await exists(configPath)).toBe(true);

    const { stdout } = await runCli(["logout"], home);

    expect(stdout).toContain("已移除");
    expect(await exists(configPath)).toBe(false);
  });

  it("lists local source adapters for every supported tool", async () => {
    const home = await tempHome();
    const { stdout } = await runCli(["sources"], home);

    for (const tool of TOOL_KEYS) {
      expect(stdout).toContain(tool);
    }
  });

  it("previews aggregate rows scanned from local tool logs without raw content", async () => {
    const home = await tempHome();
    await writeAllToolFixtures(home);

    const { stdout } = await runCli(["preview", "--json"], home);
    const payload = JSON.parse(stdout) as { entries: Array<{ tool: string; total: number }> };

    expect(payload.entries).toHaveLength(TOOL_KEYS.length);
    expect(payload.entries).toEqual(
      TOOL_KEYS.map((tool) =>
        expect.objectContaining({
          date: "2026-06-23",
          tool,
          model: `${tool}-model`,
          total: expectedFixtureTotal(tool),
        }),
      ),
    );
    expect(stdout).not.toContain("must not appear");
  });

  it("does not double-count Codex cached and reasoning token detail fields", async () => {
    const home = await tempHome();
    await writeJsonLog(home, ".codex/sessions/codex.jsonl", {
      timestamp: "2026-06-23T08:00:00.000Z",
      model: "gpt-5.5",
      usage: {
        input_tokens: 1_000,
        output_tokens: 200,
        cached_input_tokens: 800,
        reasoning_output_tokens: 50,
        total_tokens: 1_200,
      },
    });

    const { stdout } = await runCli(["preview", "--json", "--tool", "codex"], home);
    const payload = JSON.parse(stdout) as {
      entries: Array<{
        input: number;
        output: number;
        cacheRead: number;
        total: number;
      }>;
    };

    expect(payload.entries).toEqual([
      expect.objectContaining({
        input: 1_000,
        output: 200,
        cacheRead: 800,
        total: 1_200,
      }),
    ]);
  });

  it("uploads aggregate rows for all supported tools", async () => {
    const home = await tempHome();
    const usagePath = path.join(home, "usage.json");
    await writeFile(
      usagePath,
      JSON.stringify({
        entries: TOOL_KEYS.map((tool) => ({
          date: "2026-06-23",
          tool,
          model: `${tool}-demo`,
          input: 1,
          output: 2,
          cacheRead: 3,
          cacheWrite: 4,
        })),
      }),
    );

    await withUploadServer(
      (payload) => {
        expect(payload).toMatchObject({
          clientVersion: expect.any(String),
          deviceId: expect.stringMatching(/^tokenrank-/),
          timezone: expect.any(String),
          generatedAt: expect.any(String),
        });
        expect((payload as { entries: unknown[] }).entries).toHaveLength(TOOL_KEYS.length);
        expect((payload as { entries: Array<{ tool: string; total: number }> }).entries).toEqual(
          TOOL_KEYS.map((tool) =>
            expect.objectContaining({
              tool,
              total: expectedFixtureTotal(tool),
            }),
          ),
        );
      },
      async (webhookUrl) => {
        await runCli(["connect", webhookUrl], home);
        const { stdout } = await runCli(["upload", "--file", usagePath], home);

        expect(stdout).toContain(`${TOOL_KEYS.length} 条`);
      },
    );
  });

  it("splits uploads into server-sized batches", async () => {
    const home = await tempHome();
    const usagePath = path.join(home, "usage.json");
    await writeFile(
      usagePath,
      JSON.stringify({
        entries: Array.from({ length: 501 }, (_, index) => ({
          date: "2026-06-23",
          tool: "codex",
          model: `batch-${index}`,
          input: 1,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
        })),
      }),
    );

    const batchSizes: number[] = [];

    await withUploadServer(
      (payload) => {
        batchSizes.push((payload as { entries: unknown[] }).entries.length);
      },
      async (webhookUrl) => {
        await runCli(["connect", webhookUrl], home);
        const { stdout } = await runCli(["upload", "--file", usagePath], home);

        expect(stdout).toContain("501 条");
      },
    );

    expect(batchSizes).toEqual([500, 1]);
  });

  it("uploads through a configured HTTP proxy when the webhook host is unreachable", async () => {
    const home = await tempHome();
    const usagePath = path.join(home, "usage.json");
    await writeFile(
      usagePath,
      JSON.stringify({
        entries: [
          {
            date: "2026-06-23",
            tool: "codex",
            model: "proxy-demo",
            input: 1,
            output: 2,
            cacheRead: 0,
            cacheWrite: 0,
          },
        ],
      }),
    );

    let proxiedUrl: string | undefined;

    await withProxyUploadServer(
      (payload, requestUrl) => {
        proxiedUrl = requestUrl;
        expect((payload as { entries: Array<{ model: string; total: number }> }).entries).toEqual([
          expect.objectContaining({ model: "proxy-demo", total: 3 }),
        ]);
      },
      async (proxyUrl) => {
        await runCli(["connect", "http://tokenrank.invalid/api/collector/upload/test-token"], home);
        const { stdout } = await runCli(["upload", "--file", usagePath], home, {
          TOKENRANK_PROXY: proxyUrl,
        });

        expect(stdout).toContain("1 条");
      },
    );

    expect(proxiedUrl).toBe("http://tokenrank.invalid/api/collector/upload/test-token");
  });

  it("uploads HTTPS webhooks through a configured proxy tunnel", async () => {
    const home = await tempHome();
    const usagePath = path.join(home, "usage.json");
    await writeFile(
      usagePath,
      JSON.stringify({
        entries: [
          {
            date: "2026-06-23",
            tool: "codex",
            model: "https-proxy-demo",
            input: 2,
            output: 3,
            cacheRead: 0,
            cacheWrite: 0,
          },
        ],
      }),
    );

    await withHttpsUploadProxy(
      home,
      (payload) => {
        expect((payload as { entries: Array<{ model: string; total: number }> }).entries).toEqual([
          expect.objectContaining({ model: "https-proxy-demo", total: 5 }),
        ]);
      },
      async (proxyUrl, getTunnelTarget) => {
        await runCli(["connect", "https://tokenrank.invalid/api/collector/upload/test-token"], home);
        const { stdout } = await runCli(["upload", "--file", usagePath], home, {
          NODE_TLS_REJECT_UNAUTHORIZED: "0",
          TOKENRANK_PROXY: proxyUrl,
        });

        expect(stdout).toContain("1 条");
        expect(getTunnelTarget()).toBe("tokenrank.invalid:443");
      },
    );
  });

  it("rejects mismatched totals before uploading", async () => {
    const home = await tempHome();
    const usagePath = path.join(home, "usage.json");
    await writeFile(
      usagePath,
      JSON.stringify({
        entries: [
          {
            date: "2026-06-23",
            tool: "codex",
            model: "gpt-5.5",
            input: 1,
            output: 2,
            cacheRead: 3,
            cacheWrite: 4,
            total: 0,
          },
        ],
      }),
    );

    let requested = false;

    await withUploadServer(
      () => {
        requested = true;
      },
      async (webhookUrl) => {
        await runCli(["connect", webhookUrl], home);
        await expect(runCli(["upload", "--file", usagePath], home)).rejects.toMatchObject({
          stderr: expect.stringContaining("total"),
        });
        expect(requested).toBe(false);
      },
    );
  });

  it("supports the reference connect-and-upload flow before adapters exist", async () => {
    const home = await tempHome();

    await withUploadServer(
      (payload) => {
        expect((payload as { entries: unknown[] }).entries).toEqual([]);
      },
      async (webhookUrl) => {
        await runCli(["connect", webhookUrl], home);
        const { stdout } = await runCli(["upload"], home);

        expect(stdout).toContain("0 条");
      },
    );
  });

  it("scans local logs when upload is called without a file", async () => {
    const home = await tempHome();
    await writeJsonLog(home, sourceFixturePaths.codex, {
      timestamp: "2026-06-23T08:00:00.000Z",
      model: "gpt-5.5",
      usage: {
        input_tokens: 5,
        output_tokens: 6,
      },
    });

    await withUploadServer(
      (payload) => {
        expect((payload as { entries: Array<{ tool: string; total: number }> }).entries).toEqual([
          expect.objectContaining({ tool: "codex", total: 11 }),
        ]);
      },
      async (webhookUrl) => {
        await runCli(["connect", webhookUrl], home);
        const { stdout } = await runCli(["upload"], home);

        expect(stdout).toContain("1 条");
      },
    );
  });

  it("scans SQLite usage databases without reading conversation content", async () => {
    const home = await tempHome();
    await writeSqliteUsage(home, ".openclaw/agents/state.db");

    const { stdout } = await runCli(["preview", "--json", "--tool", "openclaw"], home);
    const payload = JSON.parse(stdout) as { entries: Array<{ tool: string; model: string; total: number }> };

    expect(payload.entries).toEqual([
      expect.objectContaining({
        date: "2026-06-23",
        tool: "openclaw",
        model: "sqlite-model",
        total: 34,
      }),
    ]);
  });

  it("installs, reports, and uninstalls the background service config", async () => {
    const home = await tempHome();
    await runCli(["connect", "https://tokenrank.test/api/collector/upload/secret"], home);

    const install = await runCli(["service", "install", "--interval", "120"], home);
    const plistPath = path.join(home, "Library", "LaunchAgents", "com.tokenrank.collector.plist");

    expect(install.stdout).toContain("已安装");
    expect(await readFile(plistPath, "utf8")).toContain("daemon");

    const status = await runCli(["service", "status"], home);
    expect(status.stdout).toContain("已安装");

    const uninstall = await runCli(["service", "uninstall"], home);
    expect(uninstall.stdout).toContain("已卸载");
    expect(await exists(plistPath)).toBe(false);
  });

  it("installs, reports, and uninstalls the Windows background task runner", async () => {
    const home = await tempHome();
    const windowsEnv = { TOKENRANK_TEST_PLATFORM: "win32" };
    await runCli(["connect", "https://tokenrank.test/api/collector/upload/secret"], home, windowsEnv);

    const install = await runCli(["service", "install", "--interval", "300"], home, windowsEnv);
    const runnerPath = path.join(home, ".tokenrank", "tokenrank-collector.cmd");
    const runner = await readFile(runnerPath, "utf8");

    expect(install.stdout).toContain("已安装");
    expect(runner).toContain("daemon --once");
    expect(runner).toContain("tokenrank.mjs");

    const status = await runCli(["service", "status"], home, windowsEnv);
    expect(status.stdout).toContain("已安装");

    const uninstall = await runCli(["service", "uninstall"], home, windowsEnv);
    expect(uninstall.stdout).toContain("已卸载");
    expect(await exists(runnerPath)).toBe(false);
  });
});
