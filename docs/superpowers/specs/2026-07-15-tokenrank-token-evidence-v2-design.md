# TokenRank 多 Agent Token 统计、身份去重与反作弊 V2 总设计

日期：2026-07-15

状态：产品方向已确认，待书面规格评审

适用范围：TokenRank Web、上传 API、TokenRank CLI、平台目录与排行榜

## 1. 执行摘要

TokenRank V2 采用“广平台目录、严 Token 榜、分层可信度”的产品架构：

1. 平台目录覆盖 Coding Agent、Work Agent、国内客户端和通用个人 Agent，不要求每个平台都能进入 Token 榜。
2. Token 榜只接受能解释 input、output、cache read、cache write 等语义的证据；Credits、任务数、会话数和活跃时间保留为各自的原生指标，禁止反推伪 Token。
3. 排名主体从“一个 X 账号”升级为“一个 TokenRank 参与者”；X 只是可链接、可更换的登录与公开展示身份。
4. 上传从“客户端直接提交每日总量”升级为 Evidence Ledger：先接收最小化、可去重的模型调用或 Session 增量证据，再由服务端统一归一化、风控和聚合。
5. V2 默认主榜为滚动 30 天 `Fresh Tokens`；Raw Tokens、Cache、Output、Estimated USD、客户端、国家/地区和历史数据均为独立榜单或筛选维度。
6. 本地日志和官方客户端遥测仍可被本机用户修改，因此只能标记为 `Local Evidence` 或 `Official Telemetry`。Provider/Admin 官方用量或账单连接属于 Roadmap C，当前 Verified 榜统一显示“待开放”。
7. 现有 V1 Raw Token 数据不和 V2 混算，保留为 `Legacy / Unverified`；只有仍存在原始证据的数据才允许按 V2 口径回算。

这是一份跨系统总规格，不是一份单次实现计划。后续实施应拆为身份、Evidence API、客户端 Adapter、排行榜和迁移五个可独立验收的工作流。

## 2. 已确认的产品决策

以下决策已经由用户确认，不再作为开放问题：

- 排名主体：一个自然人意图对应一个 TokenRank 参与者；X 账号不是参与者主键。
- 多设备：同一参与者可以聚合多台设备；不同系统用户分别识别。
- 默认主榜：滚动 30 天 Fresh Tokens。
- 风控：可疑数据先隔离，不进入公开榜；允许申诉和重新验证，不直接自动封号。
- 设备隐私：不采集硬件序列号、MAC 地址或完整 IP。
- 国家/地区：用户自选公开国家，服务端使用粗粒度 IP 国家作私下校验。
- 历史迁移：旧数据标记 `Legacy / Unverified`，不直接混入新榜。
- 平台优先级：同时考虑采用度和数据可验证性，不按单一“用户量”硬排序。
- 文档归属：本文件是 Web/API/CLI 的唯一上位规格；CLI 仓库不得复制并维护另一份冲突口径。
- Roadmap C：Provider/Admin 官方连接暂不实现，Verified 榜显示“待开放”。

## 3. 目标与非目标

### 3.1 目标

1. 在不上传工作正文的前提下覆盖更多 Agent 和客户端。
2. 为不同 Provider 的 Token/cache 字段建立一致、可解释、不可重复相加的归一化口径。
3. 阻止同一模型调用、同一 Session 或同一客户端数据通过多个文件、设备或 X 账号重复进入榜单。
4. 显著提高伪造、重放、改时间、刷设备和刷账号的成本，并让风险处理可审计、可恢复。
5. 支持 Token、cache、金额、客户端、模型、Provider、国家/地区、时间范围和证据可信度等多维统计。
6. 在 V1 不停服的前提下平滑迁移，并明确历史数据的可信边界。

### 3.2 非目标

- 不承诺在纯本地、自报数据条件下彻底消灭作弊。
- 不读取、上传或持久化 prompt、回复正文、代码、文件名、文件内容、工具参数、邮件地址或聊天对象。
- 不把 Credits、订阅额度、任务数、会话数或活跃时间换算为 Token。
- 不把估算目录价描述成实际账单金额。
- 不在本阶段连接 OpenAI、Anthropic、Qoder、TRAE 等官方管理后台或 Provider 账单。
- 不使用强硬件指纹或 KYC。
- 不让 TokenRank CLI 导入 Web 仓库源码、Next.js、数据库或认证模块。
- 不在一份实现计划里同时改完全部子系统。

### 3.3 成功标准

- 同一个稳定 Provider event/session evidence 在任何 X 账号、设备或来源文件下最多计分一次。
- 同一个 installation key 不能同时归属两个参与者。
- V2 服务端能从归一化字段重算 Fresh、Raw、Cache 和金额，客户端提交的总分不被直接信任。
- cache write 在 Token 总量中只出现一次；cache read 不进入 Fresh Input。
- 未知 Provider 语义或未知价格时返回 `unknown`，而不是套用兜底数字。
- 所有 P0 Adapter 都有脱敏真实 fixture、版本门控、重复计数回归测试和隐私字段阻断测试。
- V1 历史榜和 V2 榜在 UI/API 上有明确边界，用户不会误认为二者可信度相同。

## 4. 当前实现审计

### 4.1 已有能力

- Web 已有 X OAuth、公开资料、排行榜、个人 Dashboard、Webhook token、设备表、每日用量表和异常标记表。
- CLI 已支持 connect、preview、upload、后台调度、错过计划后的补跑和多来源扫描。
- 当前上传已经包含 input、output、cacheRead、cacheWrite、tool、model 和每日聚合。
- 当前服务端会重新计算 total，不完全信任客户端传入的 total。
- 当前设备 ID 会哈希后入库，Webhook token 也只保存哈希。

### 4.2 必须修复的结构性问题

| 问题 | 当前表现 | 影响 |
|---|---|---|
| 主分口径漂移 | `src/lib/token-metrics.ts` 与 CLI 当前使用 Raw Token；历史上又曾使用 Fresh Input + Output | 文档、迁移和榜单含义容易互相冲突 |
| Cache 语义按工具硬编码 | 当前仅把 Codex 标记为 input 已包含 cache read | 新 Provider 很容易重复加 cache 或漏算 |
| 通用递归 JSON 解析 | CLI 会遍历任意嵌套对象提取 usage | Session 汇总、请求明细和嵌套 usage 可能同时计入 |
| 回退指纹包含来源记录位置 | 无 Provider event ID 时会使用 `sourceRecordId` | 同一事件出现在两个文件中会生成不同指纹，无法跨文件去重 |
| 只有每日聚合 | `daily_usage` 按 user + device + date + tool + model 覆盖写入 | 服务端无法知道一条总量由哪些事件组成，也无法跨 X 全局去重 |
| 设备按用户隔离 | `devices` 唯一键是 user + deviceHash | 同一 deviceHash 可以分别绑定多个 X 用户 |
| X 字段和参与者耦合 | `users` 直接保存唯一 xId/xHandle | 无法自然支持一人多个 X、换号和账号恢复 |
| 平台是静态 enum | PostgreSQL `tool` enum 与代码常量绑定 | 每增加客户端都需要数据库迁移，平台别名容易拆榜 |
| 未知模型使用兜底价格 | 当前存在统一 fallback price | 金额看似精确，实际可能严重错误 |
| 风控只有数据表骨架 | 有 anomaly table 和 blocked 字段，但没有完整风险流水线 | 无法系统处理重放、账号冲突、设备 churn 和申诉 |
| 上传端缺少完整流控 | 有 payload 大小和条数限制，但没有正式的每凭证速率/序列控制 | 容易被高频重放或滥用 |
| 没有国家维度 | 用户、证据和榜单均无 country schema | 无法做国家榜或国家切换风控 |

V2 必须以这些现状为迁移起点，不能只增加更多 tool key。

## 5. 方案比较与选择

### 5.1 方案 A：继续扩展每日聚合

优点：改动小、上线快、与当前表兼容。

缺点：无法证明每日总量由什么组成，跨 X、跨文件、跨客户端重复提交无法可靠去重；每个新工具都继续堆特殊规则。

结论：只适合作为 V1 兼容层，不作为 V2 核心。

### 5.2 方案 B：Evidence Ledger + 服务端聚合（采用）

客户端只上传允许字段中的事件、Session revision 或累计快照证据；服务端先全局去重、归一化和风控，再生成排行榜 Rollup。

优点：能处理多客户端、多 X、Session 累计更新、跨文件重复和 Provider 语义差异；未来官方 receipt 可附着到同一条 evidence 上升级可信度。

代价：需要新协议、新表和专用 Adapter，迁移复杂度高于方案 A。

### 5.3 方案 C：只接受 Provider/Admin 官方数据

优点：可信度最高，适合真正 Verified。

缺点：个人用户覆盖窄、连接成本高、平台接口不统一，且用户已明确推迟这一阶段。

结论：作为 Roadmap C，不阻塞 V2 本地证据榜。

## 6. 总体架构

```mermaid
flowchart LR
    A[本地 Agent / Client] --> B[专用 Adapter]
    B --> C[隐私 Allowlist 与本地归一化]
    C --> D[Installation Key 签名批次]
    D --> E[/api/v2/evidence/batches]
    E --> F[签名、序列与全局去重]
    F --> G[Provider 语义归一化]
    G --> H[风险评分与证据状态]
    H --> I[(Evidence Ledger)]
    I --> J[(Daily Rollups)]
    J --> K[多维排行榜与 Dashboard]

    X[X OAuth identities] --> P[Canonical participant]
    P --> N[Installations]
    N --> D
    R[未来 Provider/Admin receipts] -.升级同一 evidence.-> I
```

核心边界：

- Adapter 负责“这个客户端字段是什么意思”，不负责决定公开分数。
- API 负责认证、幂等、去重、归一化和风控，不信任客户端 total 或 cost。
- Evidence Ledger 保存最小必要证据和 revision，不保存工作正文。
- Rollup 是可重建缓存，不是事实源。
- X identity、participant、installation 和 evidence 是四个不同概念。

## 7. 指标体系

### 7.1 原生指标类型

平台目录允许以下 `metric_kind`：

```text
token
credit
request
task
session
active_time
cost
artifact
```

不同 `metric_kind` 不允许互相换算后混榜。特别是 WorkBuddy、Qoder、Manus、Genspark 等产品的 Credits 可能同时覆盖模型、搜索、浏览器、沙箱和第三方工具，不能反推 Token。

### 7.2 Token 归一化字段

V2 统一使用以下字段：

```text
input_total_tokens
input_uncached_tokens
cache_read_tokens
cache_write_tokens
output_total_tokens
reasoning_tokens
raw_tokens
fresh_tokens
```

定义：

- `input_total_tokens`：完整有效输入，包含 cache read 和 cache creation，但每个 Token 只出现一次。
- `cache_read_tokens`：从 Provider prompt cache 复用的输入，是 input total 的子集。
- `cache_write_tokens`：本次新处理并写入缓存的输入，是 Fresh Input 的组成部分；不得在 input total 之外再次相加。
- `output_total_tokens`：Provider 计入本次生成/计费的全部输出。若 reasoning/thinking 已包含在 output 中，不得再次相加。
- `reasoning_tokens`：用于细分展示的诊断字段，默认视为 output total 的子集；只有 Provider 明确声明为独立字段时，Adapter 才将其加入 output total。

标准公式：

```text
input_uncached_tokens = max(input_total_tokens - cache_read_tokens, 0)

fresh_tokens = input_uncached_tokens + output_total_tokens

raw_tokens = input_total_tokens + output_total_tokens

cache_hit_rate = cache_read_tokens / input_total_tokens
```

当 `input_total_tokens = 0` 时，cache hit rate 为 `null`，不是 0%。

### 7.3 Provider 映射

| Provider 语义 | 归一化方式 |
|---|---|
| OpenAI | `input_total = input_tokens`；`cache_read = input_tokens_details.cached_tokens`；`output_total = output_tokens` |
| Anthropic | `input_total = input_tokens + cache_creation_input_tokens + cache_read_input_tokens`；`cache_write = cache_creation_input_tokens`；`cache_read = cache_read_input_tokens` |
| Gemini | `input_total = promptTokenCount`；`cache_read = cachedContentTokenCount`；`output_total = candidatesTokenCount + 独立 thoughtsTokenCount` |
| 无 cache 且语义明确 | `cache_read = 0`；Fresh 与 Raw 相同 |
| 只有 total、无分项 | `fresh_tokens = null`，不得进入 Fresh 榜 |

OpenAI 官方说明 input token 总量包含 cached tokens；Anthropic 官方要求把普通输入、cache creation 和 cache read 相加得到总输入；Gemini 官方说明 prompt token count 包含 cached content。Adapter 必须按 Provider 语义构建互斥口径，不能只按字段名称猜测。

### 7.4 Cache Write 的规则

Cache Write 是第一次真实处理并建立缓存，因此计入 Fresh Input；但它已经包含在 normalized input total 中，不能再次叠加。

例：

```text
普通输入：10,000
Cache Write：30,000
Cache Read：60,000
Output：5,000

Raw Tokens = 105,000
Fresh Tokens = 45,000
Cache Read Tokens = 60,000
```

### 7.5 金额

金额拆成四类：

```text
estimated_list_usd
client_reported_cost_usd
actual_billed_usd
native_credit
```

- `estimated_list_usd`：服务端根据模型、Provider、时间、生效价目版本和 Token 分项计算。
- `client_reported_cost_usd`：客户端本地展示的成本，允许保存但明确标为客户端报告。
- `actual_billed_usd`：只有官方账单或 Provider receipt 才能使用；本阶段不开放 Verified 排名。
- `native_credit`：平台原生 Credits，不换算 Token 或 USD，除非平台提供正式兑换和账单规则。

估算公式：

```text
regular_input = max(input_total - cache_read - cache_write, 0)

estimated_list_usd =
  regular_input * regular_input_rate
  + cache_read * cache_read_rate
  + cache_write * cache_write_rate
  + output_total * output_rate
  + provider_tool_fees
```

定价规则：

- 每条 evidence 记录 `pricing_version` 和价格生效日期。
- 未知模型、未知 Provider 或未知费率时金额为 `null`，禁止使用统一 fallback price。
- Cost 榜只接受价格覆盖率达到 95% 的参与者；UI 同时显示 coverage。
- 汇率只用于未来 actual billing 的展示，必须记录原币、汇率来源和日期。

## 8. Evidence Ledger

### 8.1 证据粒度

支持三种粒度：

1. `request_event`：首选。一次真实模型请求对应一条 evidence。
2. `session_revision`：客户端只提供累计 Session 用量时，同一 Session 使用 revision/upsert 语义。
3. `aggregate_snapshot`：最低可信度。累计快照只用高水位差值，不允许每次扫描都把全量重新相加。

每条 evidence 还必须声明时间精度：

```text
period_start
period_end
observed_at
time_precision: request | session | aggregate_snapshot
```

- Request 级事件使用真实请求发生时间。
- Session revision 没有逐请求时间时，新增差值归属于本次 revision 的 `observed_at`，不得全部回填到 session 开始日。
- Aggregate snapshot 只能进入与其时间粒度匹配的范围；无法准确切分到日时，不进入 today/3d/7d 日级榜。

### 8.2 最小证据字段

```json
{
  "schemaVersion": 2,
  "evidenceKind": "request_event",
  "sourceScopeDigest": "sha256:...",
  "sourceEventDigest": "sha256:...",
  "revision": 1,
  "occurredAt": "2026-07-15T08:30:00.000Z",
  "periodStart": "2026-07-15T08:29:30.000Z",
  "periodEnd": "2026-07-15T08:30:00.000Z",
  "observedAt": "2026-07-15T08:30:05.000Z",
  "timePrecision": "request",
  "clientKey": "openclaw",
  "surface": "desktop",
  "adapterVersion": "openclaw/2026.7",
  "sourceSchemaVersion": "2026.7.1",
  "providerKey": "anthropic",
  "modelKey": "claude-sonnet-4-6",
  "metricKind": "token",
  "inputTotalTokens": 100000,
  "cacheReadTokens": 60000,
  "cacheWriteTokens": 30000,
  "outputTotalTokens": 5000,
  "reasoningTokens": null,
  "clientReportedCostUsdMicros": null,
  "sourceChannelType": "cli"
}
```

禁止字段：prompt、response、content、code、filename、filepath、cwd、tool input/output、email、channel recipient、X handle、聊天账号和本地绝对路径。

### 8.3 全局去重

去重发生在 user/participant 归属之前。

优先键：

```text
source_event_digest = SHA256(
  "tokenrank-evidence-v2" +
  client_namespace +
  source_scope_digest +
  stable_provider_event_id
)
```

`source_scope_digest` 用于区分 Provider account、OpenClaw profile 或 Hermes profile 等 ID namespace。它只能由高熵、非邮箱、非 handle 的稳定 ID 生成；没有安全 ID 时留空。Provider event ID 同样只允许使用高熵、不含用户内容的稳定 ID，服务端只保存 digest。固定协议 digest 能让同一来源复制到另一 installation 后仍被识别；恶意客户端仍可伪造 digest，因此它提高去重能力但不等于 Verified。

没有稳定 ID 时使用经过 Adapter 定义的组合指纹：

```text
client + provider + model + occurred_at +
token buckets + stable session digest + request sequence
```

不得再把文件路径、JSON 行号或 `sourceRecordId` 放进跨来源指纹，否则同一事件换一个文件就会变成新数据。

### 8.4 Session Revision

OpenClaw、Hermes 等 Session 累计记录使用：

```text
evidence_key = client_namespace + stable_session_id_digest
revision = 单调递增版本或更新时间
```

Ledger 保存 revision 历史；Rollup 只应用新旧 revision 的正向差值。累计值减少、时间倒退或 lineage 语义不明时进入隔离区，不自动用绝对值覆盖。

Session 跨天时，只有来源提供逐请求时间或官方 daily aggregate 才能精确分日。否则增量按 revision 的观测时间入账，并标记 `time_precision=session`；UI 和 API 必须返回时间精度。没有稳定 Session ID 的累计结果不能伪装成 `session_revision`。

### 8.5 多 Agent 与子 Agent

- 子 Agent 发起独立模型请求时正常计数。
- 父任务的汇总、编排记录和 Session snapshot 不重复计数。
- Provider attestation 未来只升级已有 evidence 的 trust，不再新增第二条消费记录。
- 同一次请求通过 IDE、插件、Gateway 或 Provider export 被多个来源观察时，全局 event digest 仍只能对应一个 evidence head。

## 9. 身份、X 账号与 Installation

### 9.1 身份模型

```text
participant
  ├── auth_identity: X account A
  ├── auth_identity: X account B
  ├── installation: laptop
  ├── installation: desktop
  └── installation: VPS personal profile
```

- `participant`：排行榜主体，意图代表一个自然人，但不是 KYC 身份。
- `auth_identity`：X 等登录身份，可链接多个；同一 Provider account ID 全局唯一。
- `installation`：某个 OS 用户环境中的 TokenRank 安装，不等同物理硬件。
- `collector_credential`：Installation 的上传权限，不再直接绑定某个 X handle。

### 9.2 X 登录和换号

1. 首次 X 登录创建 participant 和 auth identity。
2. 已登录参与者可通过显式“链接另一个 X”流程增加身份，并再次完成 OAuth。
3. 参与者选择一个 `public_identity` 用于榜单头像、名称和 handle；切换公开账号不改变 participant_id 或历史证据归属。
4. 用户退出后用另一个 X 登录，如果当前 installation 已归属另一 participant，系统创建 `identity_installation_conflict`：暂停该 installation 的公开计分，提示链接、恢复或申诉，禁止静默迁移或自动合并。
5. 共享电脑可能属于合法多人场景，因此冲突不直接封号。

### 9.3 Installation Key

- 首次接入生成 Ed25519 keypair。
- 私钥保存在系统用户级安全存储；不可用时使用权限为当前用户的本地文件作为兼容降级。
- 服务端保存 public key 和全局唯一 fingerprint。
- 每个批次包含 batch ID、单调 sequence、payload digest 和签名。
- 同一 public key fingerprint 只能归属一个 participant。

签名证明“这批数据来自同一个 installation”，不能证明本地日志真实。开源客户端和本机管理员仍可伪造数据，因此本地签名不是 Verified。

### 9.4 多设备和共享场景

- 同一 participant 的合法多设备全部允许同步，不再依赖“只计算最高三台设备”作为主要防线。
- 30 天内新增超过 3 个 installation 触发软风险检查，但不自动丢弃真实用户数据。
- 不同 OS 用户有不同 key，因此共享物理电脑可以合法区分。
- 同一 OS 用户目录由多人共用时，不支持公平的个人归属；应选择 Team/Automation 类型或分离系统用户。
- CI、团队共享账号、批量服务器和机器人不进入个人榜；未来进入 Team/Automation 榜。

## 10. 反作弊与风险系统

### 10.1 可信度等级

| 等级 | 内部值 | 含义 | 是否进入 Token 榜 |
|---|---|---|---|
| 目录 | `catalog_only` | 只有平台收录 | 否 |
| 自报 | `self_reported` | 手工导入或不可验证汇总 | 仅 Legacy/Activity |
| 本地结构化证据 | `local_structured` | 官方客户端本地 usage、SQLite、只读统计 API | 是，标 Local Evidence |
| 官方客户端遥测 | `official_client_telemetry` | 例如经过隐私过滤的 Cowork OTel | 是，标 Official Telemetry |
| Provider Verified | `provider_verified` | Provider/Admin usage 或账单 receipt | Roadmap C，当前待开放 |

### 10.2 数据状态

```text
accepted      可进入对应榜单
provisional   个人 Dashboard 可见，公开榜暂不计分
quarantined   隔离等待自动复核或申诉
rejected      协议、签名或证据不合法
blocked       管理员确认的设备/参与者封禁
```

### 10.3 威胁与控制

| 威胁 | 主要控制 | 剩余限制 |
|---|---|---|
| 同一日志换多个 X 提交 | participant/identity 解耦、installation 全局绑定、evidence 全局唯一 | 删除安装并伪造新 evidence 仍需风险检测 |
| 同一调用被多个客户端观察 | Provider event digest、Adapter source precedence | 无稳定 ID 时组合指纹可能碰撞或漏重 |
| 重复上传同一批次 | batch ID、sequence、签名和幂等响应 | 恶意用户可生成新批次，但不能绕过 event digest |
| 修改本地 JSON/SQLite | 版本门控、字段不变量、增长率和时间异常、可信度标签 | 本地证据永远不能达到 Provider Verified |
| 伪造 total 或金额 | 服务端重算 Token 和定价；未知价格为 null | Provider 自身 usage 错误仍会传递 |
| 回拨时钟或历史刷量 | UTC occurred_at、ingested_at、最大回溯 90 天、sequence 单调检查 | 离线设备需允许合理时钟误差 |
| 反复重装刷设备 | installation churn、账号/网络粗粒度风险、隔离 | 不使用硬件指纹，因此无法彻底阻止高对抗用户 |
| 故意关闭 cache 刷 Fresh | cache 命中率、请求速率、输入/输出比、活跃天数与异常跳变 | 不读取内容，无法判断工作是否有价值 |
| 超大 Token/超频请求 | 按模型上下文上限、请求数、分钟/小时/日增长率检测 | 模型上限和 Agent tool-loop 需要版本化规则 |
| 国家榜跳区 | 公开国家变更冷却、粗粒度 geo 信号、多日一致性 | VPN 和旅行不会被自动当作弊 |

### 10.4 风险评分原则

- 风险规则按类别公开，具体阈值不全部公开，避免直接提供刷榜参数。
- 单一信号不直接封号；高风险 evidence 先隔离。
- 每个 risk event 保存规则版本、证据、状态和管理员动作。
- 用户能看到“有数据未计入”及大类原因，并可重新扫描或申诉。
- 申诉恢复后重新生成 Rollup，不直接手改榜单数字。

### 10.5 明确限制

在没有 Provider receipt、硬件 attestation 或正文语义审核的情况下，TokenRank 只能证明数据连续性、结构一致性和未重复，不能证明这些 Token 对应有价值的工作。排行榜文案必须继续说明其用途是公开比较和趣味激励，不是财务审计或生产力考核。

## 11. 平台覆盖策略

### 11.1 平台采用度不能混成一个“用户数”

平台可能只披露 registered users、seats、MAU、桌面访问量、GitHub stars 或下载量。这些量纲不能直接比较。

平台目录保存：

```text
adoption_signal_kind
adoption_signal_value
measured_at
source_url
evidence_grade: A/B/C
```

- A：平台官方定量披露或一手平台指标。
- B：有方法说明的第三方报告。
- C：只有覆盖范围或产品可用性，没有独立用户数。

优先级由“采用度信号 × 数据可验证性 × 用户需求”共同决定。

### 11.2 P0：优先完成专用 Adapter

| Canonical key | 定位 | 可用数据 | V2 要求 |
|---|---|---|---|
| `codex` | Coding Agent | request usage、input/output/cache | 替换工具级特判，使用 Provider 语义 fixture |
| `claude-code` | Coding Agent | input/output/cache creation/read | 专用 JSONL Adapter，禁止通用递归猜测 |
| `openclaw` | Personal/Work Agent | input/output/cache read/write、模型、Provider、估算成本、多 Agent | 优先使用官方 `gateway usage-cost --all-agents --json` 或只读 RPC；显式验证 regular input/cache 映射，禁止读取 transcript 正文 |
| `hermes-agent` | Personal/Work Agent | input/output/cache/reasoning、Provider、source、estimated/client-reported cost | 仅允许审计后的 analytics usage API 或 allowlist 查询 `state.db`；禁止 generic session API、`SELECT *` 和 messages 表 |
| `codebuddy-code` | Coding/Work CLI | input/output/cache、模型、Session stats | 优先 stats API；usage-data 只有在真实 fixture 和版本白名单完成后启用 |
| `gemini-cli` | Coding Agent | prompt/cache/candidate/thought usage | 按 Gemini UsageMetadata 语义建立专用 Adapter |

采用度信号：

- OpenClaw 官方 GitHub 在 2026-07-15 约 383k stars、80.4k forks；这是强开源采用度信号，不等于独立用户数。
- Hermes Agent 官方 GitHub约 215k stars、40.1k forks；同样不等于独立用户数。
- CodeBuddy 在易观 2026 中国办公智能体报告的桌面端渗透率约 14%，但属于 B 级市场报告信号。

### 11.3 P1：高采用度、活动指标或受控试点

| Canonical key | 现阶段定位 | Token 榜条件 |
|---|---|---|
| `workbuddy` | Credits、任务、会话、活动榜 | 找到稳定且字段语义明确的本地 Token schema 后升级 |
| `qclaw` | 平台目录、活动指标 | 等待稳定 usage 出口 |
| `qoder` | IDE/Quest/CLI 编码工作台；`surface=ide\|cli\|jetbrains\|web` | 不能用 Credits 反推 Token；等待各 surface 的稳定 schema，并做全局 event 去重 |
| `qoder-work` | 通用办公 Agent | 先目录/Activity，等待 Token 出口 |
| `trae-ide` | Coding Agent | 等待稳定个人 usage schema |
| `trae-work` | Work Agent；历史名 TRAE SOLO | 等待稳定个人 usage schema |
| `codebuddy-ide` | IDE | 不与 CodeBuddy Code 重复；需要全局 event 去重 |
| `codebuddy-plugin` | IDE plugin | 同上 |
| `claude-cowork` | Work Agent、受控 OTel 试点 | 只有本地先过滤到 `api_request` 且删除 prompt、tool_input、path、email 后才可上传 |
| `baidu-comate` | 国内 Coding Agent | 等待机器可读接口或稳定本地 schema |
| `cursor`、`github-copilot` | Coding Agent | V1 可继续 Legacy；V2 需稳定 event ID 和专用 fixture |
| `opencode`、`cline`、`roo-code`、`kilo-code`、`continue` | 开源 Coding Agent | 现有 generic 支持不自动等于 V2 精确支持，逐一过 Adapter gate |
| `qwen-code`、`kimi-cli`、`zcode` | 国内/开源 CLI | 逐一验证字段、版本和重复语义 |

WorkBuddy 采用度高：易观报告基于 500 份问卷及 2026 年 3 月桌面访问数据，披露 WorkBuddy 月访问约 885 万、桌面端渗透率约 15%。该数字属于有方法说明的 B 级信号，不等于独立注册用户。

Qoder 官方在 2026 年 5 月披露全球超过 500 万用户；TRAE 官方披露 2025 年达到 600 万注册用户。二者应优先进入平台目录和活动统计，但高用户量不能替代 Token 证据质量。

### 11.4 P2：平台目录和原生活动榜

```text
claude-design
claude-office-agents
chatgpt-agent
chatgpt-workspace-agents
manus
genspark
microsoft-365-copilot
copilot-cowork
gemini-spark
```

ChatGPT for Work/Business 有极高采用度，OpenAI 已披露超过 900 万付费 business users；但个人工作客户端目前没有稳定、隐私安全的原始 Token feed，因此不能因用户量大就进入 Local Token 榜。

用户此前提到的 `CodeSign` 没有找到可信的主流同名 Work Agent。目录采用官方名称 `claude-design`，不创建含义模糊的 `codesign` canonical key。

### 11.5 Roadmap C：Verified 待开放

```text
OpenAI Global Admin usage/token/cache export
Anthropic Analytics API 与 spend export
Qoder Organization Usage API
TRAE Enterprise usage export/API
BYOK Provider/Gateway receipts
其他平台未来的官方 usage API
```

Verified 榜在当前阶段只展示：

> Verified 榜单：待开放

### 11.6 Canonical key 与 alias

```text
hermes                 -> hermes-agent
clawdbot               -> openclaw
moltbot                -> openclaw
gemini                 -> gemini-cli
qwen                   -> qwen-code
codex-vps              -> codex + surface=server
codex-cache            -> codex 的 cache 指标，不再是独立客户端
tongyi-lingma          -> qoder + region=cn
trae-solo              -> trae-work
qoder work             -> qoder-work
```

这些 alias 只允许在已经确认来源目录、进程、schema 或 connector 的专用 Adapter 内生效，不能把任意字符串 `gemini`、`qwen`、`hermes` 当作全局客户端识别规则；它们也可能只是 Provider 或 model 名称。

`chatgpt-work` 不作为独立 canonical key：根据实际来源映射为 `chatgpt-agent` 或 `chatgpt-workspace-agents`。平台 family、surface、Provider 和 model 必须分字段保存，不能全部塞进 tool key。

### 11.7 平台 Registry

数据库不再使用不断膨胀的 PostgreSQL tool enum。新增：

```text
client_catalog
client_aliases
client_capabilities
client_schema_versions
```

Web 提供只读 `/api/v2/clients`；CLI 内置独立 fallback manifest，并可读取兼容的远端 registry。CLI 不导入 Web 代码，API 版本不兼容时 fail closed。

## 12. 榜单与统计维度

### 12.1 时间范围

保留兼容范围并新增 V2 all-time：

```text
today
3d
7d
30d
month
all-time-v2
```

排行榜统一按 UTC occurred_at 归属；Dashboard 可按用户时区展示。`all-time-v2` 明确从 V2 cutoff 开始，不混入 Legacy。

### 12.2 Token 榜

| 榜单 | 排序值 | 资格说明 |
|---|---|---|
| Fresh Tokens | `fresh_tokens` | 默认 30d 主榜；Fresh 不明的 evidence 不进入 |
| Raw Tokens | `raw_tokens` | 展示全部输入含 cache read 与输出 |
| Output Tokens | `output_total_tokens` | 展示生成侧用量 |
| Cache Reuse | `cache_read_tokens` | 展示绝对复用量 |
| Cache Efficiency | `cache_read / input_total` | 范围内至少 1M input 且 3 个活跃日，避免小样本占榜 |
| Cache Write | `cache_write_tokens` | 诊断缓存建立成本，不作为默认主榜 |

Fresh Tokens 不是生产力分数。它能避免 cache read 重复放大，但可能激励用户关闭缓存；因此涉及奖励时不能只看 Fresh，还要结合 trust、活跃天数、风险状态和异常请求模式。

### 12.3 金额榜

- 默认使用 `estimated_list_usd`，标题必须带“Estimated”。
- 价格覆盖率低于 95% 不进入排名，但 Dashboard 显示已知金额和 coverage。
- `client_reported_cost_usd` 单独展示，不与服务端估算相加。
- `actual_billed_usd` 和 Verified Cost 榜属于 Roadmap C。
- `native_credit` 只能在同一平台内部比较。

### 12.4 平台、Provider 与模型维度

支持：

```text
client_family
client_key
surface
provider_key
model_key
source_channel_type
actor_type: personal/team/automation
trust_level
```

OpenClaw/Hermes 的 Agent、profile 或 channel 不上传可识别名称，只允许上传稳定本地哈希或枚举 channel type；公开页面默认只展示汇总数量和类型。

### 12.5 国家/地区榜

- 用户可选一个公开 `country_code`，使用 ISO 3166-1 alpha-2；`ZZ` 表示未设置。
- Cloudflare/边缘层只产生粗粒度国家信号，应用数据库不保存完整 IP。
- 国家榜按公开 country 过滤；geo 信号只用于内部 confidence 和风险，不直接覆盖用户选择。
- 用户修改公开国家后，30 天内不进入国家榜，但仍进入全球榜。
- VPN、出差或跨境使用只触发多日一致性检查，不自动处罚。
- 不收集或展示城市、精确位置。

### 12.6 公开展示

公开榜只显示：

- 用户选择的 X 头像、名称和 handle。
- 可选国家/地区。
- 对应榜单分数、活动天数和平台汇总。
- `Local Evidence`、`Official Telemetry` 或未来 `Verified` 标记。

不显示 installation、设备指纹、内部风险分、Provider account ID、agent/profile hash、IP 信号或冲突详情。

## 13. 数据模型

### 13.1 身份与设备

| 表 | 作用 | 关键约束 |
|---|---|---|
| `users` / `participants` | 排行榜主体；可复用现有 users 作为 participant | 不再以 xId 作为事实主键 |
| `auth_identities` | 多个 X/未来其他登录身份 | provider + provider_account_id 全局唯一 |
| `installations` | OS 用户级安装 | public_key_fingerprint 全局唯一，只归属一个 participant |
| `collector_credentials` | Installation 上传权限 | 可撤销、轮换，与公开 X handle 解耦 |
| `identity_conflicts` | 换 X、共享设备和恢复流程 | 状态、原因、解决动作可审计 |

现有 NextAuth `accounts` 可作为 `auth_identities` 的基础；`users.xId/xHandle` 逐步降级为展示缓存，最终以选定 public identity 派生。

### 13.2 Evidence 与聚合

| 表 | 作用 | 关键约束 |
|---|---|---|
| `submission_batches` | 批次签名、sequence、幂等响应 | installation + sequence 唯一 |
| `usage_evidence` | 不可变 evidence revision | evidence_key + revision 唯一 |
| `usage_evidence_heads` | 当前有效 revision 与状态 | 每个 evidence_key 一条 head |
| `usage_rollups_daily` | 按 participant/date/client/model/trust 聚合 | 可从 evidence 重建 |
| `risk_events` | 风险规则命中和处置 | 保存 rule_version 和状态 |
| `country_signals` | 公开国家与粗粒度 geo confidence | 不保存完整 IP |
| `pricing_versions` | Provider/model/日期价格 | 价格区间不可重叠 |
| `client_catalog` | 平台目录与能力状态 | client_key 稳定、alias 单向映射 |

### 13.3 Legacy

现有 `daily_usage` 保留为 V1 事实表，不直接改造成 evidence。新增字段或视图标记：

```text
scoring_version = v1_raw
trust_level = self_reported
legacy = true
```

V1 和 V2 Rollup 不允许在同一榜单 SQL 中无标记相加。

## 14. API V2

### 14.1 Enrollment

```text
POST /api/v2/installations/enroll
```

要求已登录 session，提交 public key、CLI 版本、平台和 key storage capability。返回 installation ID、credential ID、服务端 nonce 和协议版本。

### 14.2 Evidence Batch

```text
POST /api/v2/evidence/batches
```

Header/Envelope 包含：

```text
protocol_version
installation_id
credential_id
batch_id
sequence
generated_at
payload_digest
signature
```

V2 credential 通过 `Authorization` 或签名 header 传递，不再放入 URL path，避免秘密进入浏览器历史、代理访问日志和路由指标。V1 webhook URL 只在兼容期保留。

响应返回：

```json
{
  "status": 0,
  "accepted": 120,
  "duplicates": 14,
  "provisional": 2,
  "quarantined": 1,
  "rejected": 0,
  "nextSequence": 83
}
```

API 必须对同一 batch 返回相同幂等结果。

### 14.3 Registry 与榜单

```text
GET /api/v2/clients
GET /api/v2/leaderboards?metric=fresh_tokens&range=30d
GET /api/v2/leaderboards?metric=fresh_tokens&range=30d&client=openclaw
GET /api/v2/leaderboards?metric=estimated_list_usd&range=month&country=CN
```

API 返回 scoring_version、trust requirements、price coverage、range cutoff 和 Legacy 标记。

### 14.4 服务端处理顺序

1. 请求体大小、条数、协议版本和速率限制。
2. credential、签名、batch ID 和 sequence。
3. 严格字段 allowlist；出现禁用字段整批拒绝并记录客户端 bug。
4. client/schema/adapter version gate。
5. 全局 evidence 去重或 revision 比较。
6. Provider 语义归一化和 Token 不变量检查。
7. 价格计算和 coverage。
8. 风险评分和 evidence 状态。
9. 事务写入 Ledger。
10. 异步或事务后更新 Rollup。

## 15. CLI 与 Adapter 架构

### 15.1 专用 Adapter 接口

每个 Adapter 必须声明：

```text
client_key
supported_client_versions
source_schema_versions
evidence_granularity
provider_semantics
allowed_source_fields
forbidden_source_fields
stable_id_strategy
revision_strategy
privacy_risk
```

未识别版本或 schema 时 fail closed，并在 `tokenrank doctor` 显示“已检测到客户端，但该版本暂不支持精确统计”。禁止回退到通用递归 JSON 猜测。

### 15.2 OpenClaw

优先级：

1. `openclaw gateway usage-cost --all-agents --json`。
2. 只读 Gateway RPC：usage/session usage endpoints。
3. 不读取 `~/.openclaw/agents/<agent>/sessions/*.jsonl` 正文作为正式方案。

原因：OpenClaw 官方 usage 已归一化 input/output/cache/cost；原始 transcript 同时含 prompt、回复和工具调用。金额映射为 estimated 或 client-reported，不是 actual billed。

OpenClaw 的标准 usage 分量按“普通输入、cache read、cache write 分列”处理。经版本 fixture 验证后的 V2 映射为：

```text
regular_input = usage.input
input_total = usage.input + usage.cacheRead + usage.cacheWrite
cache_read = usage.cacheRead
cache_write = usage.cacheWrite
output_total = usage.output
```

不得把 `usage.input` 直接当成 `input_total` 后再减 cache。每个支持版本必须有 OpenClaw golden fixture；schema 或分量关系不匹配时不产出 Fresh Tokens。

### 15.3 Hermes Agent

优先级：

1. 已启用且经过 payload 审计时，只读取 `/api/analytics/usage` 等纯 usage 聚合接口。
2. 否则对 `~/.hermes/state.db` 执行固定列名的只读 SQL。

允许的数据库列只有：

```text
id, source, model, parent_session_id, started_at, ended_at,
message_count, tool_call_count, api_call_count,
input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
reasoning_tokens, billing_provider, billing_mode,
estimated_cost_usd, actual_cost_usd, cost_status, cost_source, pricing_version
```

禁止 generic `/api/sessions`、session detail、export、messages、FTS、`SELECT *`、system prompt、reasoning content、title、user ID、preview 和 billing base URL。即使某个接口被官方客户端使用，也不代表它满足 TokenRank 隐私边界。

Hermes 本地字段 `actual_cost_usd` 仍可被用户修改，因此统一映射到 `client_reported_cost_usd`，不能生成 `actual_billed_usd`。

Hermes session 在结束前累计变化，因此必须使用 session revision。P0 开放前必须用真实 fixture 验证：compression parent/child lineage 是增量还是继承；Anthropic 与 OpenAI-compatible Provider 下 `input_tokens` 是否包含 cache；跨天 revision 如何归属。任何一项不明确时 `fresh_tokens=null`，只展示语义确定的分量或 Activity。

### 15.4 CodeBuddy Code

- 首选 `/cost` 对应的结构化统计、`/api/v1/stats` 和 `/api/v1/stats/session`。
- `~/.codebuddy/usage-data/` 只有在脱敏真实 fixture、版本白名单和未知字段拒绝策略完成后才能启用，不能因目录存在就自动上传。
- 本地 HTTP API 仍是 Beta，Adapter 必须记录 CodeBuddy 版本并使用 schema 白名单。
- 不调用 transcript、文件系统、trace 详情等包含正文或路径的端点。

### 15.5 Claude Cowork

Cowork OTel 的 `api_request` 能提供 input、output、cache read、cache creation 和 estimated cost，但同一遥测流的其他事件可能包含 prompt、tool_input、文件路径和邮箱。

因此只允许受控试点：仅面向具备管理员 OTel 配置能力的 Team/Enterprise，Claude Desktop 版本至少为 1.1.4173。用户必须在本地 OTel Collector 使用 outbound positive allowlist，只保留：

```text
event.timestamp
event.sequence
model
cost_usd
duration_ms
input_tokens
output_tokens
cache_read_tokens
cache_creation_tokens
speed
```

所有其他 event、resource、scope 和标准属性均在本地删除，包括 `user.email`、`workspace.host_paths`、prompt 和 tool_input。`cost_usd` 映射为 `estimated_list_usd` 或 `client_reported_cost_usd`，不能进入 verified billed cost。TokenRank 不直接接收完整 Cowork OTel；该能力排在 P1，不阻塞 V2 首发。

### 15.6 CLI 独立性

- Runtime 优先零第三方依赖；Ed25519、HTTP、SQLite 可行性先检查 Node 标准库和现有系统能力。
- CLI 维护自己的 Adapter/Registry manifest，通过协议测试与 Web 对齐，不导入 Web 仓库代码。
- 修改来源解析、安装或调度后必须运行 `pnpm check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`。
- Windows 后台任务继续隐藏、非交互并保留登录补跑；macOS/Linux 保留 persistent recovery。

## 16. 隐私与数据保留

### 16.1 永不上传

```text
prompt
assistant response
source code
chat content
filename / filepath / cwd
tool input / tool output
email
channel recipient / chat handle
hardware serial / MAC
full IP
```

### 16.2 允许上传

```text
时间戳
client/surface/provider/model 枚举
Token/cache/reasoning 分项
请求或 Session 的不可逆 digest
Adapter、客户端和 schema 版本
source channel type 枚举
高熵 source scope 的不可逆 digest
estimated/client-reported cost
签名与 sequence
```

### 16.3 保留周期

- 当前 accepted evidence head 的最小元数据：随参与者排行榜历史保留，用于全局去重和 Rollup 重建；仅包含时间、client/provider/model、Token 分项、状态和不可逆 digest。
- 已被替代的 revision、submission batch envelope 和幂等响应：180 天，用于申诉和重复分析。
- 去重 tombstone：账号或 Evidence 删除后继续保留不可逆 digest 180 天，防止立即重放；不保留 participant 链接或 Token 明细。
- Risk signals：90 天；管理员确认的封禁记录按安全审计要求保留。
- Country geo signal：只保留 country code 和日期桶，90 天。
- Daily Rollup：用户未删除账号时长期保留，并可由仍有效的 evidence head 重建。
- 请求传输层不可避免地会到达边缘节点，但应用、数据库和可查询业务日志不保存完整 IP；应用只接收边缘产生的 country code。
- 用户删除账号后删除身份、installation 和 Rollup；不可逆反滥用 tombstone 按上述周期自动过期。

## 17. 迁移方案

### Phase 0：冻结口径并建立对照

- 将当前榜明确标记为 `V1 Raw / Legacy`。
- 停止继续修改 V1 total 的历史含义。
- 建立 V1 与 V2 shadow 统计仪表，记录差异但不改变公开榜。
- 移除用户文案中把 V1 称为 Verified 或精确审计的暗示。

### Phase 1：指标、Registry 与身份基础

- 新增 Provider 语义归一化库和 golden vectors。
- 建立 client catalog/alias，停止新增 PostgreSQL tool enum。
- 将 participant 与 X identities 解耦。
- 新增 installation key、全局 ownership 和冲突流程。

### Phase 2：Evidence API 与 Ledger

- 新增 V2 enrollment、签名 batch、全局去重、revision、风险状态和 Rollup。
- V1 API 从 V2 GA 起继续接受旧 CLI 90 天，但只写 Legacy，并返回明确的 deprecation/upgrade 提示；90 天后停止 V1 写入。
- 新 CLI 同时可预览 V2 evidence 和服务端处理结果。
- V2 发布并完成迁移窗口后撤销 URL path 中的 V1 webhook credential，上传秘密只通过 V2 header/签名协议传递。

### Phase 3：P0 Adapter

按顺序交付：

1. Codex / Claude Code 现有来源改成专用 Adapter。
2. OpenClaw。
3. Hermes Agent。
4. CodeBuddy Code。
5. Gemini CLI。

每个 Adapter 独立灰度，不因平台已被目录收录就自动开放 Token 榜。

### Phase 4：V2 榜单和国家维度

- 默认切换到 30d Fresh Tokens。
- 开放 Raw、Output、Cache、Estimated USD、Client、Country 和 V2 All-time。
- V1 保留单独 Legacy 入口。
- Verified Tab 显示“待开放”。

### Phase 5：扩大目录和原生指标

- WorkBuddy、QClaw、Qoder/QoderWork、TRAE、Claude Cowork、Baidu Comate 等按能力进入 Token、Credit、Task、Session 或 Activity 榜。
- Credits 不跨平台混排，除非同一平台有明确同口径。

### Roadmap C

- Provider/Admin usage、账单和 receipt 连接。
- 将 receipt 附着到既有 evidence，升级为 Provider Verified。
- Verified 榜有至少一个真实 Provider source 后才开放排名，不提前用名称包装本地证据。

### 历史回算

- V2 上线时允许从仍存在的原始本地证据回放最多 90 天。
- 回放必须生成与正常扫描相同的 event digest，避免新旧设备重复。
- 只有 daily aggregate、没有原始 evidence 的 V1 数据不能进入 Fresh 或 Verified 榜。
- V2 all-time 从 cutoff 起算，并在 UI 显示起始日期。

## 18. 错误处理与运营机制

- Adapter 不识别 schema：停止该来源、保留其他来源上传，并输出明确 doctor 诊断。
- 某条 evidence 无 Fresh 口径：仍可进入 Raw/Activity（若语义明确），不进入 Fresh。
- 未知模型价格：Token 正常入账，金额为 null，降低 cost coverage。
- Rollup 失败：Ledger 事务成功后可重放，榜单显示最近成功更新时间。
- 批次部分异常：协议/隐私字段错误整批拒绝；单条证据语义或风险问题按条返回状态。
- 风险规则误报：保留原 evidence，不删除；解除隔离后重建 Rollup。
- Client schema 突变：通过 registry kill switch 暂停版本，避免静默错误累计。
- 定价更新：新增 price version，不覆盖历史价格；支持显式重算但保留旧版本审计信息。

## 19. 测试与验收

### 19.1 指标测试

- OpenAI：input 包含 cached 的 Fresh/Raw golden vector。
- Anthropic：普通 input + cache creation + cache read 的互斥 vector。
- Gemini：prompt/cache/candidates/thoughts vector。
- Cache write 不重复、cache read 不进入 Fresh。
- 只有 total 时 Fresh 为 null。
- reasoning subset/separate 两类 Provider 语义。
- 未知价格不使用 fallback。
- OpenClaw regular input + cache read + cache write 的 input_total golden vector。
- Hermes 至少覆盖 Anthropic 与 OpenAI-compatible 两类 Provider 的 input/cache inclusion fixture。

### 19.2 去重测试

- 同一 event 出现在 JSON 和 JSONL，只计一次。
- 同一 event 由两个客户端 surface 观察，只计一次。
- 同一 evidence 从两个 X/participant 提交，第二次全局 duplicate/quarantine。
- Session revision 只应用增量。
- Request、跨天 Session revision 和 aggregate snapshot 的时间归属符合 time_precision 规则。
- OpenClaw parent/subagent/tool-loop 不重复。
- Hermes compression parent/child lineage 有真实 fixture。
- Provider receipt 升级 trust，不新增 Token。

### 19.3 身份与反作弊测试

- 一个 participant 链接两个 X 后排名不拆分。
- 已绑定 installation 换新 X 登录触发 conflict，不静默迁移。
- 同一 public key 不能归属两个 participant。
- sequence 重放、跳退和 batch ID 重放保持幂等。
- 设备 churn、时间倒退、超模型上限和突增进入 provisional/quarantine。
- 解除风险后 Rollup 可重建。

### 19.4 隐私测试

- Payload schema 对 prompt、content、path、email、tool input 等键使用 denylist + allowlist 双保险。
- Fixtures 中放置 canary secret、文件路径和邮箱，断言 preview/upload 中完全不存在。
- OpenClaw Adapter 不打开 transcript 正文路径。
- Hermes 查询只选择允许列，不访问 messages/FTS。
- Cowork 未经过本地过滤的 OTel 整批拒绝。

### 19.5 迁移与 E2E

- V1 Legacy 与 V2 Rollup 不混算。
- 同一用户同时运行 V1/V2 CLI 不重复进入 V2。
- 90 天回放和 cutoff 正确。
- Fresh/Raw/Cost/Client/Country 查询返回 scoring_version 和 coverage。
- 删除账号后的数据与 tombstone 生命周期符合规格。
- Web 运行 lint、test、build；CLI 运行项目约定的完整检查链。

## 20. 上线监控指标

```text
exact_evidence_coverage
fresh_metric_coverage
price_coverage
global_duplicate_rate
cross_identity_collision_rate
quarantine_rate
appeal_overturn_rate
adapter_schema_failure_rate
rollup_lag
country_conflict_rate
legacy_to_v2_conversion_rate
```

任何 Adapter 的 duplicate rate、Fresh 差异或 schema failure 突升时，应能按 client version 一键停止公开计分而不停止本地扫描诊断。

## 21. 实施拆分

本规格覆盖多个独立子系统，后续不能写成一份巨型实现计划。用户书面评审通过后，按以下顺序分别生成计划：

1. Token normalization、pricing 与 client registry。
2. Participant/X identities、installation keys 与冲突恢复。
3. Evidence API、Ledger、global dedupe、risk states 与 Rollup。
4. Codex/Claude Code/OpenClaw/Hermes/CodeBuddy/Gemini 专用 Adapter。
5. Fresh/Raw/Cache/Cost/Client/Country/Legacy/Verified-pending 榜单。
6. P1/P2 平台目录与原生 Credit/Task/Activity 指标。

每个计划都必须产生可独立上线、可回滚、可测试的系统增量。

## 22. 参考资料

Token/cache 官方语义：

- [OpenAI API usage](https://platform.openai.com/docs/api-reference/usage/audio_transcriptions_object)
- [Anthropic pricing and token usage](https://docs.anthropic.com/en/docs/about-claude/pricing)
- [Gemini GenerateContent UsageMetadata](https://ai.google.dev/api/generate-content)

平台数据能力：

- [OpenClaw Token use and costs](https://docs.openclaw.ai/reference/token-use)
- [OpenClaw usage tracking](https://docs.openclaw.ai/concepts/usage-tracking)
- [OpenClaw Gateway usage-cost CLI](https://docs.openclaw.ai/cli/gateway)
- [OpenClaw API usage and costs](https://docs.openclaw.ai/reference/api-usage-costs)
- [OpenClaw official repository](https://github.com/openclaw/openclaw)
- [Hermes Agent slash commands](https://hermes-agent.nousresearch.com/docs/reference/slash-commands/)
- [Hermes Agent session storage](https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage)
- [Hermes Agent official repository](https://github.com/NousResearch/hermes-agent)
- [CodeBuddy Code cost management](https://www.codebuddy.cn/docs/cli/costs)
- [CodeBuddy Code local HTTP API](https://www.codebuddy.cn/docs/cli/http-api)
- [Claude Cowork monitoring](https://claude.com/docs/cowork/monitoring)

采用度与平台范围：

- [易观：中国办公智能体平台市场研究 2026](https://cloud.tencent.com/document/product/1293/133758)
- [Qoder 1.0 and 5M users](https://qoder.com/blog/qoder-1.0)
- [TRAE 2025 yearly review](https://www.trae.ai/blog/trae_2025_yearly_review)
- [Alibaba Cloud Qoder CN/QoderWork product family](https://www.alibabacloud.com/help/en/lingma/product-overview/introduction-of-lingma)
- [OpenAI business adoption](https://openai.com/index/scaling-ai-for-everyone/)
- [Claude Cowork product](https://claude.com/product/cowork)
