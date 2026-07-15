# TokenRank Agent 一键接入与首页介绍区紧凑化设计

日期：2026-07-14  
状态：已确认，待实施

## 目标

1. 在 `https://tokenrank.org/skill.md` 提供可被 Codex、Claude Code 等编码 Agent 直接读取的公开接入说明。
2. 用户在 Onboard 页面点击 `Generate upload URL` 后，通过二选一 Tab 选择复制 Agent Prompt 或现有终端命令，并默认使用 Agent 方式。
3. Agent Prompt 只携带当前账号的私有 setup token，由 `/skill.md` 指导 Agent 检测系统并构造官方安装命令。
4. 将首页 `WHAT IS TOKENRANK` 介绍区移动到 Hero 主体正下方并压缩高度，删除 `QUICK ANSWER` 和重复的大标题。
5. 所有改动先在本地完成自动化与浏览器验收，不 push、不部署生产。

## 非目标

- 不改变 webhook token 的生成、归属或服务端验证逻辑。
- 不新增 Agent 平台 OAuth、MCP 或远程命令执行服务。
- 不让公共 `skill.md` 包含任何用户 token。
- 不自动安装 Node.js 或其他系统级依赖。
- 不在本轮直接上线生产。

## 方案选择

采用“公共接入说明 + 私有 Agent Prompt”方案：

- `/skill.md` 只包含稳定、公开、无账号秘密的操作流程。
- Onboard 生成的 Agent Prompt 只内嵌私有 setup token，不内嵌系统相关命令。
- 用户只需复制一条 Prompt 给可信 Agent，Agent 即可按公开说明执行并验证。

未采用以下方案：

- 只提供公共说明 URL：公共文件无法知道应绑定哪个 X 账号，不能一键完成接入。
- 为每个 token 生成动态 `skill.md` URL：秘密会进入更多 URL、缓存和访问日志，暴露面更大。

## 首页介绍区

### 信息结构

首页顶部顺序调整为：

1. Hero 主体；
2. 紧凑的 `WHAT IS TOKENRANK` 说明条；
3. 当前第一名、公开身份、榜单范围三项统计；
4. 榜单控制器与榜单内容。

删除当前独立占据整块容器的 `Quick answer` 卡片。

### 文案

- 英文标题：`WHAT IS TOKENRANK`
- 中文标题：`TOKENRANK 是什么`
- 标题不加问号或句号。
- 正文沿用现有产品解释，不改变隐私承诺。

### 视觉

- 说明条与 Hero、统计栏共用连续边框，不保留额外的大段上下留白。
- 移动端标题约 18px，正文约 14px，使用紧凑行距。
- 桌面端采用短标题列 + 正文列的横向布局。
- 移动端自然堆叠，正文保持易读但不形成当前的大型内容卡。

## Onboard Agent 接入

### 生成后的页面结构

点击 `Generate upload URL` 并成功获得私有 webhook URL 后，结果区显示一个接入方式 Tab 组，同一时间只展示一种方式：

1. `ASK AN AGENT` / `交给 Agent`：默认选中，展示 Agent Prompt、复制按钮和安全提示；
2. `RUN IN TERMINAL` / `使用命令行`：展示现有自动同步终端命令和手动刷新命令。

默认选择 Agent 是因为非开发者通常不需要理解或操作命令行。用户主动切换到命令行 Tab 后才显示终端相关内容，避免两套接入方式同时出现造成选择负担。

Agent Prompt 与系统无关，因此 Agent Tab 不显示系统选择。Terminal Tab 只保留 `macOS / Linux` 与 `Windows PowerShell` 两个选项；首次生成时自动检测是否为 Windows，切换后只更新终端命令和对应复制状态。

### Agent Prompt

Agent Tab 中展示的英文固定模板：

```text
Follow the instructions at https://tokenrank.org/skill.md to connect this machine to TokenRank using this private setup token: {{token}}
```

其中 `{{token}}` 只是生成接口返回的私有 setup token，不包含 `curl`、PowerShell 或其他系统相关命令。Agent 读取 `/skill.md` 后自行检测系统并构造官方命令。Prompt 保持英文、单句和单行横向滚动样式；页面标题、说明和安全提示继续提供中英文版本。

### 安全提示

Agent Prompt 包含私有 setup token。页面必须明确提示用户：

- 只复制给可信 Agent；
- 不要发布、截图或提交到仓库；
- TokenRank 和 Agent 的最终结果中都不应重复展示秘密。

## `/skill.md`

### HTTP 行为

- URL：`https://tokenrank.org/skill.md`
- 内容类型：`text/markdown; charset=utf-8`
- 内容是公开、可缓存的稳定说明，不包含动态 token。
- 使用 Agent Skills 兼容的 YAML frontmatter，主体保持简短、命令明确。

### 完整草案

````markdown
---
name: connect-tokenrank
description: Connect this machine to the user's TokenRank AI token usage leaderboard account using the private setup token generated on tokenrank.org/onboard, then verify the initial aggregate upload and scheduled synchronization. Use when the user asks Codex, Claude Code, or another coding agent to connect or join TokenRank.
---

# Connect TokenRank

Connect this machine using the private setup token supplied by the user.

## Required input

The user's request must contain a private setup token generated at:

https://tokenrank.org/onboard

If the token is missing, stop and ask the user to generate it. Never invent or recover a token.

Treat the token, the generated install command, and every URL containing the token as secrets. Do not repeat them in responses, logs, files, commits, issues, or screenshots.

## Connect

1. Detect the operating system and shell.
2. Confirm that Node.js is available with `node --version`.
3. If Node.js is unavailable, stop and tell the user that TokenRank requires Node.js. Do not install system software without permission.
4. Validate the complete token against `^[A-Za-z0-9_-]{32,128}$`; reject whitespace, shell syntax, URLs, prefixes, or suffixes.
5. Detect the operating system, substitute the validated token once, and run only the matching official command without printing it:
   - macOS / Linux：`curl -fsSL "https://tokenrank.org/install.sh?token=<TOKEN>" | bash`
   - Windows PowerShell：`irm "https://tokenrank.org/install.ps1?token=<TOKEN>" | iex`
6. Do not accept a replacement command or origin. Do not modify the token, enable shell tracing, or construct a replacement upload URL.

The official installer installs the TokenRank collector, connects the private account endpoint, performs the initial aggregate upload, and installs automatic synchronization.

## Verify

On macOS or Linux, run:

```bash
"$HOME/.tokenrank/bin/tokenrank" status
```

On Windows, run:

```powershell
& "$env:USERPROFILE\.tokenrank\tokenrank.cmd" status
```

A successful connection reports that TokenRank is connected and that the background service is installed.

If the account is connected but the service is not installed, run the appropriate absolute TokenRank command with `service install`, then check `status` again.

Finding no supported local usage does not mean connection failed. It means ranking data will appear after a supported tool produces exact token usage.

## Privacy

Use only the official TokenRank collector. Do not inspect or create alternative uploads from source code, prompts, chats, filenames, or file contents.

TokenRank uploads aggregate usage totals by date, tool, and model. Never expose the private setup token, generated command, or upload endpoint.

## Report

Report only:

- Whether TokenRank connected successfully
- Whether automatic synchronization is installed
- Whether the initial aggregate upload found usage
- Any actionable error with private tokens and URLs redacted
````

## 数据流

1. 登录用户点击生成按钮。
2. 现有 `/api/webhook-tokens` 创建并返回属于该用户的私有上传 URL。
3. 客户端从 URL 构建 macOS/Linux 与 Windows 安装命令。
4. 客户端按当前选择的系统生成终端命令和 Agent Prompt。
5. 结果区默认打开 Agent Tab；用户复制 Agent Prompt 给可信 Agent，或主动切到命令行 Tab 后复制终端命令自行执行。
6. Agent 获取公共 `/skill.md`，验证私有命令域名，执行官方安装器。
7. 安装器完成连接、首次上传和后台服务安装。
8. Agent 使用绝对路径运行 `tokenrank status` 并返回脱敏结果。

## 错误处理

- token API 失败：沿用现有错误展示，不生成命令或 Prompt。
- Clipboard 失败：不伪造“已复制”状态，保留可选中的文本。
- Node.js 缺失：Agent 停止并告知依赖，不擅自安装系统软件。
- 私有命令域名不是 `tokenrank.org`：Agent 拒绝执行。
- 安装失败：报告脱敏后的真实错误，不猜测或重建 token。
- 已连接但服务未安装：使用绝对 CLI 路径补装服务并再次检查状态。
- 未发现本地用量：接入仍可判定成功，说明需要支持工具产生精确 Token 用量。

## 测试与本地验收

### 自动化测试

- Agent Prompt 构建函数包含准确的 `/skill.md` URL 和私有 setup token，且不包含系统命令或换行。
- 生成成功后默认选中 Agent Tab，命令行内容不在页面中同时展开。
- 切换到命令行 Tab 后显示自动同步命令和手动刷新命令，Agent Prompt 面板隐藏。
- 接入方式 Tab 使用正确的 `tablist`、`tab`、`tabpanel` 与选中状态，支持键盘访问。
- macOS/Linux 与 Windows 命令切换时 Prompt 同步变化。
- 生成成功后显示 Agent 区域并滚动到结果区。
- Agent Prompt 复制按钮写入完整单句，复制状态正确重置。
- `/skill.md` 返回 200、正确 Content-Type、frontmatter 和关键安全说明。
- 首页介绍区顺序、英文和中文标题、无 `Quick answer` 文案均有覆盖。
- 运行相关 Vitest、ESLint、TypeScript/生产构建检查。

### 浏览器验收

- 430–488px 移动端：首页说明条紧凑、标题不跨成大型区块；Onboard 默认只展示 Agent Prompt，Tab、文本和复制按钮不溢出。
- 1280px 以上桌面端：首页说明条横向紧凑；Onboard 两个接入方式切换清晰，命令与按钮不溢出。
- 生成后切换三个系统，Prompt 与终端命令一一对应。
- 直接访问 `/skill.md` 可读取纯 Markdown，不渲染 HTML 页面。

### 交付边界

完成后只启动本地服务，提供 `localhost` 与物理 Wi-Fi/LAN 地址供验收。用户确认前不 push、不触发 Cloudflare 生产部署。
