# Homepage Answer Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页 TokenRank 简介改成紧贴 Hero、位于统计栏之前的紧凑说明条，并统一去掉 `QUICK ANSWER` 和标题标点。

**Architecture:** 新建一个只负责简介展示的纯 React 组件，让布局和文案回归测试不依赖首页的异步榜单数据。首页只负责把本地化 copy 传入组件，并将它插在 Hero 主体与统计栏之间。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS、Vitest、Testing Library

## Global Constraints

- 英文标题必须是 `WHAT IS TOKENRANK`，中文标题必须是 `TOKENRANK 是什么`，标题不加问号或句号。
- 删除 `QUICK ANSWER` / `快速回答`，不保留第二个大型标题。
- 移动端标题约 18px、正文约 14px，并使用紧凑行距。
- 说明条必须位于 Hero 主体之后、三项统计之前，并与相邻区域共用连续边框。
- 不改变现有产品正文和隐私承诺。
- 只做本地提交和本地验收，不 push、不部署。

---

## File Structure

- Create: `components/home/home-answer-strip.tsx` — 只负责紧凑简介条的语义结构与响应式样式。
- Create: `src/lib/home-answer-strip.test.tsx` — 覆盖中英文标题、无旧 eyebrow、紧凑样式和正文。
- Modify: `src/i18n/copy.ts` — 删除 `answer.eyebrow`，修正中英文标题标点。
- Modify: `app/page.tsx` — 引入组件，将简介条插入 Hero 与统计栏之间，删除原独立 section。

### Task 1: 紧凑首页简介条

**Files:**
- Create: `components/home/home-answer-strip.tsx`
- Create: `src/lib/home-answer-strip.test.tsx`
- Modify: `src/i18n/copy.ts:114-119,578-583`
- Modify: `app/page.tsx:1-200`

**Interfaces:**
- Consumes: `copy.home.answer`，结构为 `{ title: string; body: string }`。
- Produces: `HomeAnswerStrip({ copy }: { copy: AppCopy["home"]["answer"] }): React.JSX.Element`。

- [ ] **Step 1: 写失败测试**

创建 `src/lib/home-answer-strip.test.tsx`：

```tsx
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeAnswerStrip } from "../../components/home/home-answer-strip";
import { getCopy } from "../i18n/copy";

afterEach(cleanup);

describe("HomeAnswerStrip", () => {
  it.each([
    ["en" as const, "WHAT IS TOKENRANK"],
    ["zh" as const, "TOKENRANK 是什么"],
  ])("renders the compact %s title without legacy copy or punctuation", (locale, title) => {
    const copy = getCopy(locale).home.answer;
    const { container, getByRole } = render(<HomeAnswerStrip copy={copy} />);

    expect(getByRole("heading", { level: 2, name: title })).toBeDefined();
    expect(container.textContent).not.toContain("Quick answer");
    expect(container.textContent).not.toContain("快速回答");
    expect(container.textContent).not.toContain(`${title}?`);
    expect(container.querySelector("h2")?.className).toContain("text-lg");
    expect(container.querySelector("p")?.className).toContain("text-sm");
    expect(container.querySelector("p")?.className).toContain("leading-5");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm exec vitest run src/lib/home-answer-strip.test.tsx`

Expected: FAIL，因为 `components/home/home-answer-strip.tsx` 尚不存在。

- [ ] **Step 3: 实现最小组件和页面接线**

创建 `components/home/home-answer-strip.tsx`：

```tsx
import type { AppCopy } from "@/src/i18n/copy";

export function HomeAnswerStrip({ copy }: { copy: AppCopy["home"]["answer"] }) {
  return (
    <section
      aria-labelledby="what-is-tokenrank"
      className="tr-reveal grid gap-2 border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] px-4 py-4 sm:px-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-6"
    >
      <h2
        id="what-is-tokenrank"
        className="font-display text-lg font-bold uppercase leading-5 tracking-[-0.02em] text-[color:var(--tr-ivory)] sm:text-xl"
      >
        {copy.title}
      </h2>
      <p className="tr-body max-w-4xl text-sm leading-5">{copy.body}</p>
    </section>
  );
}
```

在 `src/i18n/copy.ts` 中把英文和中文 `answer` 改为：

```ts
answer: {
  title: "WHAT IS TOKENRANK",
  body: "TokenRank is a public AI token usage leaderboard. It compares aggregate usage from supported coding agents and AI tools while keeping prompts, source code, chats, filenames, and file contents off the server.",
},
```

```ts
answer: {
  title: "TOKENRANK 是什么",
  body: "TokenRank 是公开的 AI Token 用量排行榜。它比较各类 Coding Agent 与 AI 工具的聚合用量，同时确保 prompt、源码、对话、文件名和文件内容不会上传到服务器。",
},
```

在 `app/page.tsx` 引入组件：

```tsx
import { HomeAnswerStrip } from "@/components/home/home-answer-strip";
```

在 Hero 主体网格闭合后、统计栏 `<div className="grid border-x...">` 之前插入：

```tsx
<HomeAnswerStrip copy={copy.home.answer} />
```

删除原来的独立 `aria-labelledby="what-is-tokenrank"` section。

- [ ] **Step 4: 运行定向测试并确认通过**

Run: `pnpm exec vitest run src/lib/home-answer-strip.test.tsx`

Expected: 2 tests PASS。

- [ ] **Step 5: 运行静态检查**

Run: `pnpm exec eslint app/page.tsx components/home/home-answer-strip.tsx src/i18n/copy.ts src/lib/home-answer-strip.test.tsx`

Expected: exit 0，无 ESLint error。

- [ ] **Step 6: 提交独立成果**

```bash
git add app/page.tsx components/home/home-answer-strip.tsx src/i18n/copy.ts src/lib/home-answer-strip.test.tsx
git commit -m "Tighten homepage TokenRank introduction"
```

