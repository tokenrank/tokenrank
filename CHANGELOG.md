# 更新日志

## 2026-07-12

- 将品牌定位从“AI Coding Token 排行榜”扩展为面向所有 AI 使用者的 Token 排行榜，启用英文口号 `BURN TOKENS. ASCEND RANKS.` 与中文口号 `TOKEN 燃烧。RANKING 狂飙。`。
- 同步更新首页、Logo 副标、规则与分享文案、SEO metadata、Open Graph 图片、个人页描述、`llms.txt` 和 README；隐私说明改为明确区分聚合用量与不上传的 prompt、代码、对话内容。
- 将 Windows 自动同步从两个可见 `.cmd` 任务迁移为单个隐藏 Task Scheduler XML 任务，使用非交互 PowerShell，定时运行不再弹窗。
- 新增 00:00/12:00 同步边界状态、登录触发补跑、失败重试和进程锁；用户错过计划时间后会在下次登录补传一次，重复触发不会重复上传。
- CLI 重做为高饱和 Neon telemetry wall：TrueColor 大色块、响应式 Block Art、启动脉冲、逐工具扫描卡片、真实 batch 上传动画和静态成功终帧；后台、JSON、非 TTY 与 `NO_COLOR` 保持纯净。
- 新增 `cursor`、`github-copilot`、`continue` 工具键、数据库迁移、排行榜/仪表盘标签和精确数据来源说明。
- 新增工具专属来源、provider event 指纹和来源优先级去重；Cursor 内运行的 Codex、Cline、Roo Code、Kilo Code 仍归属实际 AI 工具。
- 新增 `tokenrank status` 与 `tokenrank doctor`，用于检查连接、任务、最后同步、待补跑边界和各工具精确来源状态。
- 修复 JSONL 会话 ID 被跨记录继承导致用量事件静默丢失的问题；模型与日期上下文仍可跨行复用，但事件 ID 和发生时间仅作用于当前记录。
- 修复 `--tool`、`--since` 等过滤上传错误推进完整计划边界的问题，并让后台服务注册失败直接返回错误；`service status` 现在会核对真实的 launchd、systemd 或 Task Scheduler 注册状态。

## 2026-07-11

- 全站从原黑金卡片风格重做为“AI Coding 竞技场 × 工业数据终端”：采用骨黑、信号绿、警示橙、网格背景、实时信号带、直角数据面板与赛事化排名语言。
- 重构首页、规则页、X 登录页、四阶段上榜流程、未登录/登录面板、公开个人页、全站导航与页脚；保留原有数据、认证、同步和隐私业务逻辑。
- 重做排行榜的真实数据与空状态，补齐首页产品叙事、榜首概览、分享区、全工具横向选择和移动端排名卡。
- 重做公开记录与 dashboard 数据界面：品牌化个人标识、六项统计、32 周热力图、60 天趋势、三类分布和带粘性表头的明细数据窗。
- 新增自托管 Antonio Variable 与 IBM Plex Sans Variable 字体，避免生产构建依赖 Google Fonts。
- 修复远程头像失败时的破图，统一回退为首字母；补齐英文 `K/M/B` 与中文 `万/亿` 的 Token 单位国际化。
- 更新 app icon、Open Graph / Twitter 分享图、README 与 QA 验收记录；桌面和 390px 移动视口均完成真实浏览器回归。

## 2026-07-07

- 将 TokenRank 视觉系统重做为黑金品牌：新增自定义 TR logo、黑金全局设计 token、双层卡片、品牌按钮、深色排行榜和 dashboard 组件。
- 新增轻量 i18n：默认英文文案，中文通过 `tokenrank_locale` cookie 切换；页面、组件、登录错误、onboarding、dashboard、规则和榜单文案集中维护。
- 重写首页、规则页、onboarding、dashboard、登录页、公开个人页和分享卡文案，删掉冗长说明，改为更短的产品化表达。
- 更新 Open Graph 图片和 app icon，使分享预览与黑金品牌一致。
## 2026-06-28

- 新增自定义 X 登录页 `/auth/signin`，替换 NextAuth 默认登录页，并让登录入口走统一产品化流程。
- 重新设计全站页面：统一导航、首页榜单操作台、`/onboard` 一页式上榜流程、`/dashboard` 上传数据面板、规则页和公开统计页的视觉系统与用户路径。
- 加固公开 collector 上传接口：校验 token 格式、限制请求体大小，并补充超大 payload 和非法 token 测试。
- 新增 `/dashboard` 隐私设置：登录用户可以切换个人资料公开状态和排行榜参与状态。
- 新增 SEO/AEO 入口：metadata、Open Graph、Twitter card、JSON-LD、`robots.txt`、`sitemap.xml` 和 `llms.txt`。
- 优化 collector CLI 的 SQLite 读取：优先使用 Node 内置 `node:sqlite`，减少对本机 `sqlite3` 命令的依赖。
- 限制公开排行榜返回前 100 名，避免响应无限增长。
- 增加基础安全响应头，并让首页在本地缺少数据库配置时降级为空榜单，便于开发和 e2e 验证。
