# TokenRank AI 使用者品牌定位 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 TokenRank 从“AI Coding Token 排行榜”升级为面向所有 AI 使用者的 Token 排行榜，并在首页、品牌副标、SEO、分享图、机器可读入口和项目文档中使用已批准的新口号与隐私表述。

**Architecture:** 继续以 `src/i18n/copy.ts` 作为页面中英文文案源，首页只增加换行渲染能力；站点级 SEO 与机器可读描述分别在现有 `site.ts`、Next.js metadata、OG 图片和 `llms.txt` 中同步。具体采集工具名称可以保留，但品牌总定位不再以 `Coding` 或程序员为边界。

**Tech Stack:** Next.js App Router、React、TypeScript、Tailwind CSS、Next.js Metadata API、`next/og` ImageResponse、Playwright、Vitest、pnpm。

## Global Constraints

- 英文主口号必须是两行 `BURN TOKENS.` 和 `ASCEND RANKS.`。
- 中文主口号必须是两行 `TOKEN 燃烧。` 和 `RANKING 狂飙。`。
- 英文 Hero 说明必须是 `Track the tokens you put to work across AI agents and see where you rank. Only aggregate usage is uploaded—never your prompts, code, or chats.`。
- 中文 Hero 说明必须是 `汇总你在各类 Agent 与 AI 工具中的 Token 用量，与真正把 AI 用起来的人同榜竞技。只上传聚合用量，不上传 prompt、代码或对话。`。
- `Token` 继续作为数据机制与竞技体验核心，但排名只代表聚合 Token 使用强度，不代表能力、效率或产出质量。
- 品牌级文案移除 `AI Coding` 总括限定；描述具体采集源时可以保留 Codex、Claude Code 等工具名称。
- 隐私表述必须明确“只上传聚合用量，不上传 prompt、代码或对话”，不得继续使用 `Private work` 或“私有工作”。
- 不引入新依赖，不改变数据库、采集、计分、路由或交互行为。

---

### Task 1: 用浏览器测试锁定新首页品牌文案

**Files:**
- Modify: `tests/web.spec.ts`
- Test: `tests/web.spec.ts`

**Interfaces:**
- Consumes: 首页 `/` 的语言 cookie 切换和现有 Playwright `webServer`。
- Produces: 新英文/中文 Hero、SEO 标题和隐私说明的回归断言。

- [ ] **Step 1: 将旧首页断言改为新品牌断言**

```ts
await expect(page).toHaveTitle("TokenRank - AI token leaderboard");
await expect(page.getByRole("heading", { name: "BURN TOKENS. ASCEND RANKS." })).toBeVisible();
await expect(
  page.getByText(
    "Track the tokens you put to work across AI agents and see where you rank. Only aggregate usage is uploaded—never your prompts, code, or chats.",
  ),
).toBeVisible();
```

中文切换断言改为：

```ts
await expect(page.getByRole("heading", { name: "TOKEN 燃烧。 RANKING 狂飙。" })).toBeVisible();
await expect(
  page.getByText(
    "汇总你在各类 Agent 与 AI 工具中的 Token 用量，与真正把 AI 用起来的人同榜竞技。只上传聚合用量，不上传 prompt、代码或对话。",
  ),
).toBeVisible();
```

- [ ] **Step 2: 运行首页 e2e 并确认测试先失败**

Run: `pnpm test:e2e --grep "leaderboard renders|language switch"`

Expected: FAIL，失败信息包含旧标题 `AI coding has a scoreboard.` 或找不到新标题 `BURN TOKENS. ASCEND RANKS.`。

- [ ] **Step 3: 暂不提交，进入 Task 2 完成最小实现**

Task 1 的失败测试与 Task 2 的页面文案属于同一个可审阅交付，二者一起提交。

---

### Task 2: 更新中英文页面文案并支持口号换行

**Files:**
- Modify: `src/i18n/copy.ts`
- Modify: `app/page.tsx`
- Modify: `components/brand/tokenrank-logo.tsx`
- Modify: `components/dashboard/usage-dashboard.tsx`
- Test: `tests/web.spec.ts`

**Interfaces:**
- Consumes: `getCopy(locale)` 返回的现有 `home.hero`、`common.brand`、规则、分享、dashboard 和登录文案对象。
- Produces: 保持对象字段不变的新品牌文案；`home.hero.title` 使用换行符，首页通过 `whitespace-pre-line` 显示为两行。

- [ ] **Step 1: 更新英文与中文品牌源文案**

在 `src/i18n/copy.ts` 使用以下核心值：

```ts
// English
tagline: "AI token leaderboard",
shortTagline: "Token usage ranking",
metaTitle: "AI token leaderboard",
metaDescription:
  "TokenRank ranks people putting AI to work by aggregate token usage across supported agents and AI tools. Only aggregate usage is uploaded—never prompts, code, chats, filenames, or file contents.",
hero: {
  eyebrow: "AI token leaderboard",
  title: "BURN TOKENS.\nASCEND RANKS.",
  body: "Track the tokens you put to work across AI agents and see where you rank. Only aggregate usage is uploaded—never your prompts, code, or chats.",
},
```

```ts
// Chinese
tagline: "AI Token 排行榜",
shortTagline: "Token 使用榜",
metaTitle: "AI Token 排行榜",
metaDescription:
  "TokenRank 按公开 X 身份展示 Agent 与 AI 工具的聚合 Token 用量排行，只上传聚合用量，不上传 prompt、代码、对话、文件名或文件内容。",
hero: {
  eyebrow: "AI Token 排行榜",
  title: "TOKEN 燃烧。\nRANKING 狂飙。",
  body: "汇总你在各类 Agent 与 AI 工具中的 Token 用量，与真正把 AI 用起来的人同榜竞技。只上传聚合用量，不上传 prompt、代码或对话。",
},
```

同一文件中的分享、规则、公开页、dashboard 和登录描述改用 `AI tokens`、`AI usage`、`Agent 与 AI 工具` 等表述，不再把用户总括为 AI Coding 用户。

- [ ] **Step 2: 让首页标题保留换行**

将首页标题 class 调整为：

```tsx
<h1 className="tr-title mt-8 max-w-5xl whitespace-pre-line text-[clamp(4rem,10vw,9.5rem)]">
  {copy.home.hero.title}
</h1>
```

- [ ] **Step 3: 同步 Logo 和 dashboard 分享文案**

Logo 副标改为：

```tsx
AI token league
```

dashboard 分享文案改为：

```ts
locale === "zh"
  ? `我在 TokenRank 已经使用 ${formatTokens(summary.totalTokens, locale)} AI Token。`
  : `I have logged ${formatTokens(summary.totalTokens, locale)} AI tokens on TokenRank.`;
```

- [ ] **Step 4: 运行首页 e2e 并确认通过**

Run: `pnpm test:e2e --grep "leaderboard renders|language switch"`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交页面品牌文案**

```bash
git add tests/web.spec.ts src/i18n/copy.ts app/page.tsx components/brand/tokenrank-logo.tsx components/dashboard/usage-dashboard.tsx
git commit -m "feat: reposition TokenRank for AI users"
```

---

### Task 3: 同步 SEO、OG 图片与机器可读入口

**Files:**
- Modify: `src/lib/site.ts`
- Modify: `app/layout.tsx`
- Modify: `app/opengraph-image.tsx`
- Modify: `app/llms.txt/route.ts`
- Modify: `app/u/[handle]/page.tsx`

**Interfaces:**
- Consumes: `siteName`、`siteUrl`、`siteDescription`、Next.js `Metadata` 和 `ImageResponse` 现有接口。
- Produces: 与新定位一致的 metadata、JSON-LD 描述、OG 图片、个人页描述和 `llms.txt`。

- [ ] **Step 1: 更新站点级描述与 metadata**

`src/lib/site.ts` 的中英文描述改为：

```ts
export const siteDescription =
  "TokenRank ranks people putting AI to work by aggregate token usage across supported agents and AI tools. It never uploads prompts, source code, chats, filenames, or file contents.";
export const siteDescriptionZh =
  "TokenRank 展示真正把 AI 用进工作的人在 Agent 与 AI 工具中的聚合 Token 用量排行，不上传 prompt、源码、对话、文件名或文件内容。";
```

`app/layout.tsx` 的默认、Open Graph 和 Twitter 标题统一为 `TokenRank - AI token leaderboard`，关键词使用 `AI agents`、`AI token usage`、`AI leaderboard`，移除品牌级 `AI Coding` 限定。

- [ ] **Step 2: 更新 OG 图片**

在 `app/opengraph-image.tsx`：

```ts
export const alt = "TokenRank AI token leaderboard";
```

并将图片中的品牌标签更新为 `AI TOKEN LEAGUE`、隐私标签更新为 `AGGREGATE USAGE // PRIVATE CONTENT`，主标题以两个嵌套 `<div>` 显示：

```tsx
<div>BURN TOKENS.</div>
<div>ASCEND RANKS.</div>
```

- [ ] **Step 3: 更新个人页和 llms.txt**

个人页描述改为：

```ts
const description = `Public aggregate AI token stats for ${profile.user.name} on TokenRank.`;
```

`llms.txt` 将产品描述改为 AI agents 与 AI tools 的聚合 Token 排行榜，并将 Leaderboard 条目描述为按总 Token、预估金额和具体 Agent/AI 工具排行。

- [ ] **Step 4: 运行静态检查与生产构建**

Run: `pnpm lint`

Expected: exit code 0。

Run: `pnpm build`

Expected: exit code 0，并成功生成 `/opengraph-image`、`/llms.txt` 和动态个人页。

- [ ] **Step 5: 提交 SEO 与分享面更新**

```bash
git add src/lib/site.ts app/layout.tsx app/opengraph-image.tsx app/llms.txt/route.ts 'app/u/[handle]/page.tsx'
git commit -m "feat: align TokenRank metadata with AI users"
```

---

### Task 4: 更新项目文档并完成全量验证

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Verify: all changed source and test files

**Interfaces:**
- Consumes: 已完成的新品牌文案与验证命令。
- Produces: 中文项目说明、变更记录和无遗漏的最终验证结果。

- [ ] **Step 1: 更新 README 产品定位**

首段改为说明 TokenRank 面向真正把 AI 用进工作的人，按 Agent 与 AI 工具的聚合 Token 用量排行；品牌视觉改称“AI Token 竞技场 × 工业数据终端”；继续保留不上传 prompt、源码、聊天、文件名或文件内容的边界。

- [ ] **Step 2: 更新 CHANGELOG**

在 `2026-07-12` 下新增品牌定位变更，明确新中英文口号、用户范围从 AI Coding 扩展到 AI 使用者，以及首页、SEO、OG、机器可读文案和 README 已同步。

- [ ] **Step 3: 扫描旧品牌定位残留**

Run:

```powershell
rg -n -S "AI coding has a scoreboard|AI 编程也该有一张战绩榜|Public identity, private work|公开身份，私有工作|AI coding league|AI Coding Token 排行榜" -g '!node_modules/**' -g '!docs/superpowers/**' .
```

Expected: 无用户可见品牌级残留；测试中用于确认 CLI 不输出旧字符串的否定断言允许保留。

- [ ] **Step 4: 运行全量验证**

Run: `pnpm lint`

Expected: exit code 0。

Run: `pnpm test -- --runInBand`

Expected: 全部 Vitest tests PASS。

Run: `pnpm test:e2e`

Expected: 全部 Playwright tests PASS。

Run: `pnpm build`

Expected: exit code 0。

- [ ] **Step 5: 提交文档并确认工作区状态**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: update TokenRank AI user positioning"
git status --short
```

Expected: 工作区为空。
