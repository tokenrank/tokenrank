# TokenRank

TokenRank 是公开 X 身份的 AI Coding Token 使用排行榜。默认英文界面，支持中文切换；品牌视觉采用“AI Coding 竞技场 × 工业数据终端”系统，以骨黑、信号绿和警示橙建立强排名感。它只展示按日期、工具和模型聚合后的 Token 统计，不上传 prompt、源码、聊天内容、文件名或文件内容。

## 本地开发

```bash
pnpm install
pnpm dev --hostname 127.0.0.1
```

打开 `http://127.0.0.1:3000`。

本地环境变量：

```bash
DATABASE_URL=
AUTH_X_ID=
AUTH_X_SECRET=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

`NEXT_PUBLIC_APP_URL` 会用于 canonical URL、`robots.txt`、`sitemap.xml`、`llms.txt` 和安装脚本里的默认服务地址。X developer callback URL 必须匹配：

```text
http://127.0.0.1:3000/api/auth/callback/twitter
```

没有 `DATABASE_URL` 时，首页会降级为空榜单，方便本地和 e2e 渲染；登录、上传、dashboard 和真实榜单数据仍然需要数据库。

## 品牌与国际化

- 默认语言为英文，导航里的语言切换会写入 `tokenrank_locale` cookie。
- 中文文案是英文源文案的地道翻译，集中维护在 `src/i18n/copy.ts`。
- Antonio Variable 与 IBM Plex Sans Variable 通过 `@fontsource-variable` 在仓库内自托管，生产构建不依赖 Google Fonts。
- 新品牌组件由 `app/globals.css`、`components/brand/*`、全站 shell 与各页面共同组成：直角数据面板、实时信号带、超窄赛事标题、等宽数字、信号绿主操作和警示橙状态反馈。
- 英文 Token 紧凑单位使用 `K/M/B`，中文使用 `万/亿`；远程头像加载失败时自动回退到用户首字母。

## 公开页面与接口

- `/`：公开竞技榜单，包含实时榜首、分享区、总榜、金额榜、全工具榜和时间窗口。
- `/rules`：隐私边界、公平规则和计分说明，以公开协议形式呈现。
- `/onboard`：登录 X、生成上传地址、安装本地 collector、检测首次上传的四阶段上榜流程。
- `/dashboard`：登录用户的私有战绩面板，展示热力图、趋势、客户端/工具/模型分布和隐私设置。
- `/u/[handle]`：公开个人战绩，包括统计、热力图、趋势、分布和带粘性表头的明细数据窗。
- `/robots.txt`、`/sitemap.xml`、`/llms.txt`：搜索引擎和 AI crawler 可读入口。
- `/api/boards`：可用榜单和工具 key。
- `/api/leaderboard`：公开榜单数据。
- `/api/dashboard`：当前登录用户的设置和上传状态。

登录用户可以在 `/dashboard` 切换个人资料公开状态和是否参与排行榜。

## Collector CLI

本地 CLI 只采集聚合后的 Token 行。它不会上传 prompt、代码或对话内容。

生产环境 macOS / Linux 安装：

```bash
curl -fsSL "https://tokenrank.vercel.app/install.sh" | bash
```

生产环境 Windows PowerShell 安装：

```powershell
irm "https://tokenrank.vercel.app/install.ps1" | iex
```

连接私人 webhook URL 后，可以启用本地 12:00 和 24:00（00:00）自动同步：

```bash
tokenrank service install
```

macOS 会创建 LaunchAgent，Linux 会创建 systemd user service，Windows 会创建单个隐藏 Task Scheduler 任务。Windows 任务使用隐藏、非交互 PowerShell，不会在定时同步时弹出控制台窗口。

三端都按本地时间 00:00 和 12:00 同步。电脑在计划时间关机或用户未登录时，macOS 会在 LaunchAgent 加载后、Linux 会通过 persistent timer、Windows 会在下次登录后自动补传一次。本机 `service-state.json` 会记录已完成的计划边界，因此日历触发和登录补跑同时发生也不会重复上传。

查看状态、诊断数据源或移除任务：

```bash
tokenrank service status
tokenrank status
tokenrank doctor
tokenrank service uninstall
```

本地开发命令：

```bash
pnpm tokenrank tools
pnpm tokenrank sources
pnpm tokenrank status
pnpm tokenrank doctor
pnpm tokenrank preview --json
pnpm tokenrank connect "https://your-site.example/api/collector/upload/secret"
pnpm tokenrank upload
pnpm tokenrank service install
pnpm tokenrank service status
pnpm tokenrank service uninstall
pnpm tokenrank logout
pnpm tokenrank upload --file usage.json
```

不传 `--file` 时，`upload` 会扫描已知本地工具日志位置并上传聚合行。先运行 `preview --json` 可以检查将要上传的聚合 payload。CLI 会把大上传切成 500 行批次；服务端也会拒绝超出大小限制的异常 payload。

`usage.json` 可以是 entry 数组，也可以是包含 `entries` 的对象：

```json
{
  "entries": [
    {
      "date": "2026-06-23",
      "tool": "codex",
      "model": "gpt-5.5",
      "input": 100,
      "output": 50,
      "cacheRead": 20,
      "cacheWrite": 10
    }
  ]
}
```

排行榜主分使用 raw token 口径。Codex 的 `input` 已包含 cached input，因此 Codex 主分为 `input + output`；Claude Code 等把缓存字段单列的工具，主分为 `input + output + cacheRead + cacheWrite`。上传里的 `total` 即使存在，也会由服务端按该 raw 口径重新计算后入库。

支持的工具：`codex`、`claude-code`、`hermes`、`openclaw`、`cline`、`opencode`、`workbuddy`、`gemini`、`zcode`、`kimi`、`kilo-code`、`codex-vps`、`roo-code`、`qwen`、`codex-cache`、`cursor`、`github-copilot`、`continue`。

工具归属按实际发起模型调用的 AI 工具判断，与宿主编辑器无关：Cursor 中的 Codex 仍计入 `codex`，VS Code/Cursor 中的 Cline、Roo Code、Kilo Code 仍计入各自工具。采集器先按 provider event ID 和来源优先级去重，再生成每日聚合，避免同一事件从 API、会话或日志重复进入统计。

Cursor 只接受原生 Agent 的精确 Token 明细。Cursor Teams 可以把官方 Admin API 的 spend/usageEvents JSON 保存为 `~/.tokenrank/imports/cursor-usage.json`，采集器会读取其中的 `tokenUsage`；个人版如果本机没有明确的 input/output/cache Token 字段，`tokenrank doctor` 会显示 `EXACT SOURCE REQUIRED`，不会用请求数、积分、字符数或估算值替代。GitHub Copilot 只读取带明确 Token 类型的 CLI OpenTelemetry NDJSON/专属日志，Continue 读取其会话 Token usage；缺少精确字段时同样不会上传。

当前自动扫描支持 JSON、JSONL、SQLite 和 DB 文件。SQLite 读取优先使用 Node 内置 `node:sqlite`，没有可用运行时时再回退到外部 `sqlite3` 命令；查询只读取 token、date、model 等聚合列，并跳过原始内容字段。`tokenrank doctor` 只显示工具、精度状态和行数，不输出本机路径或原始日志内容。

## 验证

```bash
pnpm lint
pnpm test
pnpm build
pnpm e2e
```
