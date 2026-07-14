# Agent Connect Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 发布公开 `/skill.md`，并让 Onboard 用户在默认 Agent Tab 与命令行 Tab 之间二选一完成 TokenRank 接入。

**Architecture:** 使用静态 Next.js Route Handler 返回无秘密的 Agent Skill 文档；在现有命令构建模块中新增纯 Agent Prompt 构建函数；在 `WebhookTokenPanel` 中增加可访问的二选一 Tab，并继续复用现有按平台生成的私有安装命令。

**Tech Stack:** Next.js 16 App Router Route Handlers、React 19、TypeScript、Tailwind CSS、Vitest、Testing Library

## Global Constraints

- `/skill.md` 必须返回 `text/markdown; charset=utf-8`，且不包含任何动态 token。
- Agent Prompt 必须保持单句英文，并包含 `https://tokenrank.org/skill.md` 与当前系统的完整私有安装命令。
- 默认选择 `ASK AN AGENT` / `交给 Agent`，同一时间只展示 Agent 或命令行一种接入方式。
- 命令行 Tab 才显示自动同步命令和手动刷新命令。
- macOS、Linux、Windows PowerShell 选择继续保留；切换后 Prompt 与命令同步更新。
- Prompt 必须提示用户它包含秘密，只能交给可信 Agent。
- 不改变 webhook token 生成、归属和服务端验证逻辑。
- 不自动安装 Node.js，不新增依赖。
- 只做本地提交和本地验收，不 push、不部署。

---

## File Structure

- Create: `src/lib/connect/tokenrank-skill-document.ts` — 保存公开、稳定的 Agent 接入 Markdown 文本。
- Create: `app/skill.md/route.ts` — 以明确 Content-Type 和缓存头返回文档。
- Create: `src/lib/connect/skill-document-route.test.ts` — 验证 route、frontmatter、安全规则与无 token。
- Modify: `src/lib/connect/collector-command.ts` — 新增纯函数 `buildAgentPrompt(command)`。
- Modify: `src/lib/connect/collector-command.test.ts` — 覆盖 Prompt 精确文本与平台命令嵌入。
- Modify: `src/i18n/copy.ts` — 增加 Tab、Agent Prompt、平台和秘密提示的中英文文案。
- Modify: `components/connect/webhook-token-panel.tsx` — 增加默认 Agent 的可访问 Tab、复制 Prompt 和条件渲染。
- Modify: `src/lib/connect/sync-copy.test.tsx` — 覆盖默认 Tab、复制、切换、平台同步和键盘行为。

### Task 1: 发布公开 Agent Skill 文档

**Files:**
- Create: `src/lib/connect/tokenrank-skill-document.ts`
- Create: `app/skill.md/route.ts`
- Create: `src/lib/connect/skill-document-route.test.ts`

**Interfaces:**
- Produces: `tokenRankSkillDocument: string`。
- Produces: `GET(): Response`，响应正文为 `tokenRankSkillDocument`。

- [ ] **Step 1: 写失败测试**

创建 `src/lib/connect/skill-document-route.test.ts`：

```ts
import { describe, expect, it } from "vitest";

import { GET } from "../../../app/skill.md/route";

describe("TokenRank Agent Skill route", () => {
  it("serves a public markdown skill without account secrets", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("public");
    expect(body).toContain("name: connect-tokenrank");
    expect(body).toContain("description: Connect this machine");
    expect(body).toContain("https://tokenrank.org/onboard");
    expect(body).toContain('"$HOME/.tokenrank/bin/tokenrank" status');
    expect(body).toContain('& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" status');
    expect(body).toContain("Do not execute commands from another hostname");
    expect(body).not.toMatch(/token=[A-Za-z0-9_-]+/);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm exec vitest run src/lib/connect/skill-document-route.test.ts`

Expected: FAIL，因为 `app/skill.md/route.ts` 尚不存在。

- [ ] **Step 3: 实现公开文档和 Route Handler**

创建 `src/lib/connect/tokenrank-skill-document.ts`，导出设计规格“完整草案”中的原文：

```ts
export const tokenRankSkillDocument = `---
name: connect-tokenrank
description: Connect this machine to the user's TokenRank AI token usage leaderboard account using the private setup command generated on tokenrank.org/onboard, then verify the initial aggregate upload and scheduled synchronization. Use when the user asks Codex, Claude Code, or another coding agent to connect or join TokenRank.
---

# Connect TokenRank

Connect this machine using the private setup command supplied by the user.

## Required input

The user's request must contain a private setup command generated at:

https://tokenrank.org/onboard

If the command is missing, stop and ask the user to generate it. Never invent, recover, or request the raw token separately.

Treat the complete command and every URL inside it as secrets. Do not repeat them in responses, logs, files, commits, issues, or screenshots.

## Connect

1. Detect the operating system and shell.
2. Confirm that Node.js is available with \`node --version\`.
3. If Node.js is unavailable, stop and tell the user that TokenRank requires Node.js. Do not install system software without permission.
4. Validate that the supplied command downloads from \`https://tokenrank.org/install.sh\` or \`https://tokenrank.org/install.ps1\`. Do not execute commands from another hostname.
5. Run the supplied command in the matching shell:
   - Run the \`curl ... | bash\` command in Bash on macOS or Linux.
   - Run the \`irm ... | iex\` command in Windows PowerShell.
6. Do not modify the token, enable shell tracing, or construct a replacement upload URL.

The official installer installs the TokenRank collector, connects the private account endpoint, performs the initial aggregate upload, and installs automatic synchronization.

## Verify

On macOS or Linux, run:

\`\`\`bash
"$HOME/.tokenrank/bin/tokenrank" status
\`\`\`

On Windows, run:

\`\`\`powershell
& "$env:USERPROFILE\\.tokenrank\\tokenrank.cmd" status
\`\`\`

A successful connection reports that TokenRank is connected and that the background service is installed.

If the account is connected but the service is not installed, run the appropriate absolute TokenRank command with \`service install\`, then check \`status\` again.

Finding no supported local usage does not mean connection failed. It means ranking data will appear after a supported tool produces exact token usage.

## Privacy

Use only the official TokenRank collector. Do not inspect or create alternative uploads from source code, prompts, chats, filenames, or file contents.

TokenRank uploads aggregate usage totals by date, tool, and model. Never expose the private setup command or upload endpoint.

## Report

Report only:

- Whether TokenRank connected successfully
- Whether automatic synchronization is installed
- Whether the initial aggregate upload found usage
- Any actionable error with private tokens and URLs redacted
`;
```

创建 `app/skill.md/route.ts`：

```ts
import { tokenRankSkillDocument } from "@/src/lib/connect/tokenrank-skill-document";

export const dynamic = "force-static";

export function GET() {
  return new Response(tokenRankSkillDocument, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `pnpm exec vitest run src/lib/connect/skill-document-route.test.ts`

Expected: 1 test PASS。

- [ ] **Step 5: 提交独立成果**

```bash
git add app/skill.md/route.ts src/lib/connect/tokenrank-skill-document.ts src/lib/connect/skill-document-route.test.ts
git commit -m "Publish TokenRank Agent Skill instructions"
```

### Task 2: 构建包含私有命令的单句 Agent Prompt

**Files:**
- Modify: `src/lib/connect/collector-command.ts`
- Modify: `src/lib/connect/collector-command.test.ts`

**Interfaces:**
- Consumes: 已生成的完整平台命令 `command: string`。
- Produces: `buildAgentPrompt(command: string): string`。

- [ ] **Step 1: 写失败测试**

在 `src/lib/connect/collector-command.test.ts` 增加：

```ts
import { buildAgentPrompt, buildCollectorCommand, buildCollectorCommands } from "./collector-command";

it("builds a one-sentence Agent prompt around the private platform command", () => {
  const command = 'curl -fsSL "https://tokenrank.test/install.sh?token=abc123" | bash';

  expect(buildAgentPrompt(command)).toBe(
    `Follow the instructions at https://tokenrank.org/skill.md to connect this machine to TokenRank using this private setup command: ${command}`,
  );
  expect(buildAgentPrompt(command)).not.toContain("\n");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm exec vitest run src/lib/connect/collector-command.test.ts`

Expected: FAIL，因为 `buildAgentPrompt` 尚未导出。

- [ ] **Step 3: 实现纯函数**

在 `src/lib/connect/collector-command.ts` 增加：

```ts
const agentSkillUrl = "https://tokenrank.org/skill.md";

export function buildAgentPrompt(command: string): string {
  return `Follow the instructions at ${agentSkillUrl} to connect this machine to TokenRank using this private setup command: ${command}`;
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `pnpm exec vitest run src/lib/connect/collector-command.test.ts`

Expected: 4 tests PASS。

- [ ] **Step 5: 提交独立成果**

```bash
git add src/lib/connect/collector-command.ts src/lib/connect/collector-command.test.ts
git commit -m "Build copyable TokenRank Agent prompts"
```

### Task 3: Onboard 二选一接入 Tab

**Files:**
- Modify: `src/i18n/copy.ts:258-300,724-766`
- Modify: `components/connect/webhook-token-panel.tsx`
- Modify: `src/lib/connect/sync-copy.test.tsx`

**Interfaces:**
- Consumes: `buildCollectorCommands(webhookUrl)` 与 `buildAgentPrompt(command)`。
- Produces: 默认 Agent、可切换 Terminal 的可访问 Tab UI；复制按钮分别写入 Prompt 或命令。

- [ ] **Step 1: 扩充失败测试**

在 `src/lib/connect/sync-copy.test.tsx` 保存并恢复 `navigator.clipboard`：

```tsx
const originalNavigatorClipboard = window.navigator.clipboard;

afterEach(() => {
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: originalNavigatorClipboard,
  });
});
```

增加以下测试：

```tsx
it("defaults to the Agent method and copies the private one-sentence prompt", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(window.navigator, "platform", { configurable: true, value: "Linux x86_64" });
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (X11; Linux x86_64)",
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        status: 0,
        webhookUrl: "https://tokenrank.test/api/collector/upload/agent-prompt-token",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  const { getByRole, queryByRole } = render(<WebhookTokenPanel />);
  fireEvent.click(getByRole("button", { name: "Generate upload URL" }));

  const agentTab = await waitFor(() => getByRole("tab", { name: "Ask an agent" }));
  expect(agentTab.getAttribute("aria-selected")).toBe("true");
  expect(queryByRole("tabpanel", { name: "Run in terminal" })).toBeNull();
  expect(getByRole("tabpanel", { name: "Ask an agent" }).textContent).toContain(
    "https://tokenrank.org/skill.md",
  );

  fireEvent.click(getByRole("button", { name: "Copy Agent prompt" }));
  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("install.sh?token=agent-prompt-token"),
    );
  });
});

it("shows terminal commands only after selecting the terminal method", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        status: 0,
        webhookUrl: "https://tokenrank.test/api/collector/upload/terminal-tab-token",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  const { getByRole, queryByText } = render(<WebhookTokenPanel />);
  fireEvent.click(getByRole("button", { name: "Generate upload URL" }));
  await waitFor(() => getByRole("tab", { name: "Run in terminal" }));

  expect(queryByText("Manual refresh")).toBeNull();
  fireEvent.click(getByRole("tab", { name: "Run in terminal" }));
  expect(getByRole("tabpanel", { name: "Run in terminal" }).textContent).toContain("Manual refresh");
  expect(getByRole("tabpanel", { name: "Run in terminal" }).textContent).toContain(
    "install.sh?token=terminal-tab-token",
  );
});

it("supports arrow-key method switching and keeps the platform-specific prompt in sync", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        status: 0,
        webhookUrl: "https://tokenrank.test/api/collector/upload/keyboard-tab-token",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  const { getByRole } = render(<WebhookTokenPanel />);
  fireEvent.click(getByRole("button", { name: "Generate upload URL" }));
  const agentTab = await waitFor(() => getByRole("tab", { name: "Ask an agent" }));

  fireEvent.keyDown(agentTab, { key: "ArrowRight" });
  expect(getByRole("tab", { name: "Run in terminal" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(getByRole("button", { name: "Windows PowerShell" }));
  fireEvent.keyDown(getByRole("tab", { name: "Run in terminal" }), { key: "ArrowLeft" });
  expect(getByRole("tabpanel", { name: "Ask an agent" }).textContent).toContain(
    "install.ps1?token=keyboard-tab-token",
  );
});
```

更新现有长命令布局测试：生成后先点击 `Run in terminal` Tab，再查找横向滚动命令。更新滚动测试：默认断言滚动目标包含 Agent Prompt，再切换命令行和平台。

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm exec vitest run src/lib/connect/sync-copy.test.tsx`

Expected: 新增测试 FAIL，因为 Tab、Prompt 和复制按钮尚不存在。

- [ ] **Step 3: 增加中英文 UI copy**

在两种语言的 `onboard.webhook` 中增加同结构字段：

```ts
methodLabel: "Connection method",
methods: {
  agent: "Ask an agent",
  terminal: "Run in terminal",
},
agentTitle: "Connect with an agent",
agentBody: "Copy this prompt to Codex, Claude Code, or another trusted coding agent.",
agentCopyLabel: "Copy Agent prompt",
agentSecurity: "This prompt contains your private setup token. Share it only with an agent you trust, and never post or commit it.",
platformLabel: "Setup platform",
```

```ts
methodLabel: "接入方式",
methods: {
  agent: "交给 Agent",
  terminal: "使用命令行",
},
agentTitle: "让 Agent 帮你接入",
agentBody: "把这段 Prompt 复制给 Codex、Claude Code 或其他你信任的编码 Agent。",
agentCopyLabel: "复制 Agent Prompt",
agentSecurity: "这段 Prompt 包含你的私有 setup token，只能交给可信 Agent，不要发布或提交到仓库。",
platformLabel: "接入系统",
```

同时使用以下中性文案覆盖两种接入方式：

```ts
title: "Choose how to connect",
body: "Generate a private upload URL, then give the secure prompt to a trusted coding agent or run the platform command yourself. Either method installs the collector, uploads once, and schedules background sync.",
empty: "Click \"Generate upload URL\" first. Then choose an Agent prompt or a terminal command.",
```

```ts
title: "选择接入方式",
body: "生成私有上传地址后，可以把安全 Prompt 交给可信编码 Agent，或者自己运行对应系统的命令。两种方式都会安装采集器、立即上传一次并开启后台同步。",
empty: "先点「生成上传地址」，然后选择复制 Agent Prompt 或终端命令。",
```

- [ ] **Step 4: 实现默认 Agent 的可访问 Tab**

在 `components/connect/webhook-token-panel.tsx`：

1. 从 `lucide-react` 引入 `Bot` 和 `ShieldAlert`。
2. 从 `collector-command` 同时引入 `buildAgentPrompt`。
3. 增加 `type ConnectionMethod = "agent" | "terminal"`。
4. 增加 `connectionMethod`、`copiedAgent`、两个 tab ref。
5. 从当前 `command` 派生 `agentPrompt`。
6. 生成新 token 时重置到 `agent`；切换平台时重置三种复制状态。
7. 实现 `copyAgentPrompt()`。
8. 实现 ArrowLeft、ArrowRight、Home、End 键切换和焦点移动。
9. 在结果区顶部渲染 `role="tablist"` 的两个按钮；活动 Tab 使用 `aria-selected="true"` 和 `tabIndex={0}`。
10. `connectionMethod === "agent"` 时只渲染 Agent `tabpanel`、平台切换、可换行 Prompt、复制按钮和秘密提示。
11. `connectionMethod === "terminal"` 时只渲染现有自动同步与手动刷新内容。

Agent Prompt 面板的核心结构必须是：

```tsx
<div
  id="connection-method-agent-panel"
  role="tabpanel"
  aria-labelledby="connection-method-agent-tab"
  className="space-y-4"
>
  <div>
    <div className="flex items-center gap-2">
      <Bot className="size-4 text-[color:var(--tr-gold-bright)]" aria-hidden="true" />
      <h3 className="text-sm font-black text-[color:var(--tr-ivory)]">{copy.agentTitle}</h3>
    </div>
    <p className="mt-1 text-xs font-semibold leading-5 text-[color:var(--tr-muted)]">{copy.agentBody}</p>
  </div>
  <CommandTargetSelector
    active={commandTarget}
    ariaLabel={copy.platformLabel}
    onSelect={selectCommandTarget}
  />
  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 border border-[color:var(--tr-line)] bg-black/45 p-2">
    <pre className="min-w-0 whitespace-pre-wrap break-words px-3 py-2 text-sm leading-6 text-[color:var(--tr-ivory)] [overflow-wrap:anywhere]">
      <code>{agentPrompt}</code>
    </pre>
    <button type="button" onClick={copyAgentPrompt} aria-label={copy.agentCopyLabel} className="tr-button min-h-10 shrink-0 px-3 py-2 text-sm">
      {copiedAgent ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      <span className="whitespace-nowrap">{copiedAgent ? actions.copied : actions.copy}</span>
    </button>
  </div>
  <div className="flex gap-3 border-l-4 border-[color:var(--tr-orange)] bg-[color:var(--tr-orange-soft)]/25 p-4 text-xs leading-5 text-[color:var(--tr-ivory-soft)]">
    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[color:var(--tr-orange)]" aria-hidden="true" />
    <p>{copy.agentSecurity}</p>
  </div>
</div>
```

将三个平台按钮提取为同文件内 `CommandTargetSelector`，Agent 与 Terminal panel 复用它，避免重复标记。

- [ ] **Step 5: 运行 UI 测试并确认通过**

Run: `pnpm exec vitest run src/lib/connect/sync-copy.test.tsx`

Expected: 全部 sync-copy tests PASS。

- [ ] **Step 6: 运行连接模块回归测试和 ESLint**

Run: `pnpm exec vitest run src/lib/connect/collector-command.test.ts src/lib/connect/install-script.test.ts src/lib/connect/sync-copy.test.tsx src/lib/connect/skill-document-route.test.ts`

Expected: 全部 PASS。

Run: `pnpm exec eslint components/connect/webhook-token-panel.tsx src/i18n/copy.ts src/lib/connect/collector-command.ts src/lib/connect/collector-command.test.ts src/lib/connect/sync-copy.test.tsx app/skill.md/route.ts src/lib/connect/tokenrank-skill-document.ts src/lib/connect/skill-document-route.test.ts`

Expected: exit 0，无 ESLint error。

- [ ] **Step 7: 提交独立成果**

```bash
git add components/connect/webhook-token-panel.tsx src/i18n/copy.ts src/lib/connect/sync-copy.test.tsx
git commit -m "Add Agent-first onboarding tabs"
```

### Task 4: 全量本地验证与浏览器验收

**Files:**
- Verify only: all files changed by Tasks 1-3 and the homepage plan。

**Interfaces:**
- Consumes: 完成后的首页、Onboard 和 `/skill.md`。
- Produces: 可交给用户的本地 localhost 与物理 Wi-Fi/LAN 验收地址。

- [ ] **Step 1: 运行完整自动化检查**

Run: `pnpm test`

Expected: 全部 Vitest tests PASS。

Run: `pnpm lint`

Expected: exit 0。

Run: `pnpm build`

Expected: Next.js 生产构建成功，`/skill.md` 出现在路由输出中。

- [ ] **Step 2: 启动 LAN 可访问的本地服务**

Run: `pnpm dev --hostname 0.0.0.0`

Expected: Next.js 输出 localhost URL，服务监听所有本地接口。

- [ ] **Step 3: 浏览器验收首页**

在 430–488px 与 1280px 以上视口验证：

- `WHAT IS TOKENRANK` / `TOKENRANK 是什么` 位于 Hero 主体与统计栏之间；
- 不出现 `QUICK ANSWER` / `快速回答`；
- 移动端没有大型介绍卡或横向溢出；
- 榜单 anchor 和底部导航未回归。

- [ ] **Step 4: 浏览器验收 Onboard 与 `/skill.md`**

使用已登录的本地 Onboard 会话生成一次测试 URL，验证：

- 默认 Agent Tab；
- Prompt 可复制且包含当前平台命令；
- 切换命令行后显示自动同步和手动刷新；
- 平台切换同步更新两种内容；
- 移动端没有横向溢出；
- `/skill.md` 直接显示 Markdown，响应 Content-Type 正确且无 token。

- [ ] **Step 5: 交付本地验收链接**

报告 `http://localhost:<port>/`、`http://localhost:<port>/onboard`、`http://localhost:<port>/skill.md`，并提供物理 Wi-Fi/LAN IP 的同端口地址。明确说明尚未 push、尚未部署生产。
