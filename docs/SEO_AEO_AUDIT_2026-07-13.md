# TokenRank 本地 SEO / AEO 审计与优化报告

日期：2026-07-13
范围：仅审计 `D:\GitHub\tokenrank` 当前本地代码、本地生产构建与 `http://localhost:3010/`；未审计、部署或修改生产站。

## 结论

本轮已完成从技术抓取、页面 metadata、可抽取正文、结构化数据、内部链接到本地性能的闭环优化。

| 项目 | 本地结果 |
| --- | --- |
| `seo-auditor` 首页自动审计 | 100 / 100，Grade A |
| `seo-auditor` 规则页自动审计 | 100 / 100，Grade A |
| Lighthouse Mobile | SEO 100、Accessibility 100、Best Practices 100、Agentic Browsing 98 |
| Lighthouse Desktop | SEO 100、Accessibility 100、Best Practices 100、Agentic Browsing 100 |
| Performance trace | LCP 1.056s、TTFB 377ms、CLS 0.05 |
| 首页 HTML | 约 77.3 KB，低于 150 KB 目标 |
| 规则页 HTML | 约 37.8 KB，低于 150 KB 目标 |
| 自动化验证 | 全量 21 个测试文件、142 项测试通过；Next.js 16.2.9 生产构建通过 |

移动端 Agentic Browsing 的 98 分仅来自一次导航采样中的 CLS 0.082；仍低于 0.1 的良好阈值。独立 performance trace 的 CLS 为 0.05。

## 已修复的问题

### 1. 首页缺少可直接回答搜索意图的正文

首页原本以视觉 Hero 和动态榜单为主，搜索引擎与答案引擎能抽取的稳定解释不足。现已增加：

- `What is TokenRank?` Quick Answer；
- 三步工作原理；
- 5 个可见 FAQ，覆盖统计口径、隐私、支持工具、去重与上榜方式；
- 3 个明确的相关入口，连接规则、上榜流程和 `llms.txt`。

所有重要答案都以可见 HTML 文本呈现，不依赖客户端交互才能读取。

### 2. 首页与子页面 metadata 边界不清晰

已完成：

- 首页独立 title、description、canonical、OpenGraph、Twitter Card；
- 规则页独立 title、description、canonical、OpenGraph、Twitter Card；
- 上榜页保留 `noindex, nofollow`，同时拥有正确的 canonical 与社交分享信息；
- 公开用户页使用姓名、handle 和真实聚合 Token 数据生成唯一 title 与 description；
- GoogleBot 开放大图预览和完整 snippet；
- 删除无排名作用的 `meta keywords`。

canonical 保持项目现有无尾斜杠 URL 约定，与 Next.js 实际规范化结果一致，避免 canonical 指向会再次重定向的 URL。

### 3. 结构化数据与页面内容不完全对齐

现有结构化数据调整为：

- 首页：`WebSite`；
- 首页榜单：`CollectionPage` + `ItemList`，列表项与当前可见榜单一致；
- 规则页：`BreadcrumbList`，并增加对应的可见面包屑；
- 公开用户页：`ProfilePage` + `Person` + `BreadcrumbList`；
- JSON-LD 统一转义 `<`，降低注入风险。

没有为了“富结果分数”添加 `FAQPage`：FAQ 内容对用户和答案引擎保持可见，但 Google 已将常规 FAQ 富结果限制在权威政府与医疗网站，TokenRank 不属于适用范围。

### 4. sitemap 混入 `noindex` 页面且遗漏公开资料页

已完成：

- 从 sitemap 移除 `noindex` 的 `/onboard`；
- 保留可索引的首页与规则页；
- 配置数据库时，动态加入 `profilePublic = true` 且存在 handle 的公开用户页；
- 用户页使用真实 `updatedAt` 作为 `lastModified`；
- 静态页不再在每次生成 sitemap 时伪造“刚刚更新”的时间。

### 5. robots 规则阻止爬虫读取页面级 `noindex`

`robots.txt` 现在只禁止 `/api/`，不再阻止 `/dashboard` 抓取。这样合规爬虫可以读取页面自身的 `noindex`，避免出现“URL 被 robots 阻止，但仍可能以无摘要形式进入索引”的冲突。

### 6. AEO 机器可读上下文不完整

`llms.txt` 已增加工作原理和 FAQ 深链，并继续保留核心页面、公开 API 与隐私边界。它是补充入口，不替代可见正文、内部链接、可抓取性和标准结构化数据。

### 7. 可访问性与链接安全

Lighthouse 初次发现三步卡片序号和页脚年份对比度不足，以及 Logo 链接 accessible name 与可见文字不一致。现已修复，并将外部 X 分享链接显式设为 `noopener noreferrer`。最终移动端和桌面端 Accessibility 均为 100。

## 核对清单

### Metadata

- [x] 首页 title 56 字符，主关键词靠前且包含品牌。
- [x] 首页 description 152 字符，准确概括榜单、覆盖工具与隐私边界。
- [x] 规则页 title、description 唯一且与页面意图一致。
- [x] 首页、规则页、上榜页和公开用户页均有绝对 canonical。
- [x] 首页与主要页面 OpenGraph 字段完整。
- [x] Twitter Card 使用 `summary_large_image`。
- [x] 本地 OG 与 Twitter 图片路由均返回 200 `image/png`。
- [x] 未保留对 Google 无效的 `meta keywords`。

### Structured Data

- [x] 首页 `WebSite` 仅出现在首页。
- [x] 榜单使用与可见内容一致的 `CollectionPage` / `ItemList`。
- [x] 规则页使用 `BreadcrumbList`。
- [x] 公开用户页使用 `ProfilePage` / `Person` / `BreadcrumbList`。
- [x] JSON-LD 语法可解析并进行 `<` 转义。
- [x] 未添加不适用于本产品的 FAQ 富结果标记。

### Content / Internal Links

- [x] 首页仅有一个 H1。
- [x] H1 → H2 → H3 层级无跳级。
- [x] 首页顶部附近存在 Quick Answer。
- [x] 5 个 FAQ 以可见文本呈现。
- [x] 首页有 29 个唯一内部链接。
- [x] 规则页和公开资料页有可见面包屑。

### Site-level / Technical

- [x] `robots.txt`、`sitemap.xml`、`llms.txt` 本地均返回 200。
- [x] sitemap 不包含 `noindex` 页面。
- [x] sitemap 可在配置数据库时加入公开用户页。
- [x] 首页、规则页、上榜页本地均返回 200。
- [x] 首页 HTML 小于 150 KB。
- [x] LCP 小于 2.5s，CLS 小于 0.1，TTFB 小于 600ms。
- [x] Next.js 16.2.9 生产构建通过。

## 仍需在后续环境处理的事项

1. 当前中英文通过 cookie 共用同一 URL。默认英文可索引，但中文没有独立 URL 与 `hreflang`。若中文自然搜索是明确增长目标，应单独设计 `/zh/` 或 locale segment；这会改变 URL 架构，本轮未擅自实施。
2. 本地 `.env.local` 没有数据库，因此本轮未用真实用户数据验证动态用户 sitemap；查询逻辑、类型检查、测试和构建已通过。
3. 本地生产模式访问认证相关页面需要 `NEXTAUTH_SECRET`。本轮仅给审计进程注入一次性 secret，没有写入仓库或本地配置。
4. 首页保持动态渲染，因为语言 cookie 与实时榜单数据都属于请求时信息。当前 LCP、TTFB、CLS 已达标，不建议为了静态标识牺牲实时行为。

## 本地验收地址

- 首页：`http://localhost:3010/`
- 规则页：`http://localhost:3010/rules`
- 上榜页：`http://localhost:3010/onboard`
- robots：`http://localhost:3010/robots.txt`
- sitemap：`http://localhost:3010/sitemap.xml`
- AEO 上下文：`http://localhost:3010/llms.txt`

当前服务仅绑定 `127.0.0.1`，没有提供 LAN 地址。
