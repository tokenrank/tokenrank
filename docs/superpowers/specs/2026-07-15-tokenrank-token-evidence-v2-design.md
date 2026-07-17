# TokenRank 多 Agent Token 统计、身份去重与反作弊 V2 总设计

日期：2026-07-15

状态：产品方向已确认，专家评审修订完成，待拆分实施计划

评审修订日期：2026-07-16

适用范围：TokenRank Web、上传 API、TokenRank CLI、平台目录与排行榜

## 1. 执行摘要

TokenRank V2 采用“广平台目录、严 Token 榜、分层可信度”的产品架构：

1. 平台目录覆盖 Coding Agent、Work Agent、国内客户端和通用个人 Agent，不要求每个平台都能进入 Token 榜。
2. Token 榜只接受能解释 input、output、cache read、cache write 等语义的证据；Credits、任务数、会话数和活跃时间保留为各自的原生指标，禁止反推伪 Token。
3. 排名主体从“一个 X 账号”升级为“一个 TokenRank 参与者”；X 只是可链接、可更换的登录与公开展示身份。
4. 上传从“客户端直接提交每日总量”升级为 Evidence Ledger：签名批次先形成不可变 `usage_observation`，再解析为跨客户端唯一的 `canonical_usage_event` 与当前 `canonical_event_head`，最后由服务端统一归一化、风控和聚合。
5. V2 默认主榜为滚动 30 天 `Provider-reported Fresh Tokens`；Raw Tokens、Cache、Output、Estimated USD、客户端、国家/地区和历史数据均为独立榜单或筛选维度。该单位用于公开比较，不宣称不同模型 tokenizer 或不同模态完全等价。
6. 本地日志和官方客户端遥测仍可被本机用户修改，因此只能标记为 `Local Evidence` 或 `Official Telemetry`。Provider/Admin 官方用量或账单连接属于 Roadmap C，当前 Verified 榜统一显示“待开放”。
7. 现有 V1 Raw Token 数据不和 V2 混算，保留为 `Legacy / Unverified`；只有仍存在原始证据的数据才允许按 V2 口径回算。

这是一份跨系统总规格，不是一份单次实现计划。后续实施应拆为指标与 Registry、身份恢复、签名协议、Observation/Canonical Event/Ledger、客户端 Adapter、排行榜和迁移等可独立验收的工作流。

## 2. 已确认的产品决策

以下决策已经由用户确认，不再作为开放问题：

- 排名主体：一个自然人意图对应一个 TokenRank 参与者；X 账号不是参与者主键。
- 多设备：同一参与者可以聚合多台设备；不同系统用户分别识别。
- 默认主榜：滚动 30 天 Fresh Tokens；公开展示名和 API 元数据标记为 Provider-reported。
- 风控：可疑数据先隔离，不进入公开榜；允许申诉和重新验证，不直接自动封号。
- 设备隐私：不采集硬件序列号、MAC 地址或完整 IP。
- 国家/地区：用户自选公开国家，服务端使用粗粒度 IP 国家作私下校验。
- 历史迁移：旧数据标记 `Legacy / Unverified`，不直接混入新榜。
- 平台优先级：同时考虑采用度和数据可验证性，不按单一“用户量”硬排序。
- 文档归属：本文件是 Web/API/CLI 的唯一上位规格；CLI 仓库不得复制并维护另一份冲突口径。
- Roadmap C：Provider/Admin 官方连接暂不实现，Verified 榜显示“待开放”。
- 去重事实模型：客户端上传的是 observation；同一 Provider request 或稳定 Session 在服务端只对应一个 canonical event，多个客户端观察只增加 provenance，不增加 Token。
- 主榜解释：Fresh Tokens 保留为默认 30d 主榜，但展示名和 API 元数据必须说明它是 Provider-reported Token 单位；Provider Verified 开放前不用于现金、奖品或高价值激励。
- 平台状态：P0/P1/P2 表示工程优先级，不等于已经满足精确统计；是否开放 Token 榜由独立 `integration_status` gate 决定。

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

- 同一个稳定 Provider request 或 client Session canonical event 在任何 X 账号、设备或来源文件下最多计分一次。
- 同一个 installation key 不能同时归属两个参与者。
- V2 服务端能从归一化字段重算 Fresh、Raw、Cache 和金额，客户端提交的总分不被直接信任。
- cache write 在 Token 总量中只出现一次；cache read 不进入 Fresh Input。
- 未知 Provider 语义或未知价格时返回 `unknown`，而不是套用兜底数字。
- 所有 P0 Adapter 都有脱敏真实 fixture、版本门控、重复计数回归测试和隐私字段阻断测试。
- V1 历史榜和 V2 榜在 UI/API 上有明确边界，用户不会误认为二者可信度相同。
- Provider request 的 canonical key 不包含观察它的 client namespace；同一请求被 IDE、插件、Gateway 或 export 观察时仍只形成一个 canonical event。
- 签名协议有跨平台 canonicalization golden vector；同一签名输入在 Windows、macOS、Linux 产生相同 payload digest 和验证结果。
- 任意 event revision、风险状态变更或 participant merge 后，增量 Rollup 与从 Ledger 全量重建的结果一致。
- 主榜 eligibility 由 evidence kind、语义覆盖、时间精度、模态、可信度和风险状态共同决定，不只检查 `fresh_tokens != null`。

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

客户端只上传允许字段中的 request、Session revision 或累计快照 observation；服务端先保存签名 provenance，再解析 canonical event、归一化、风控并生成排行榜 Rollup。

优点：能处理多客户端、多 X、Session 累计更新、跨文件重复和 Provider 语义差异；未来官方 receipt 可作为 observation 附着到同一 canonical event 上升级可信度。

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
    E --> F[签名、序列与字段验证]
    F --> O[(Usage Observations)]
    O --> G[Canonical Event Resolution]
    G --> H[Provider 归一化与风险状态]
    H --> I[(Canonical Event Heads)]
    I --> Q[(Rollup Outbox)]
    Q --> J[(Daily Rollups)]
    J --> K[多维排行榜与 Dashboard]

    X[X OAuth identities] --> P[Canonical participant]
    P --> N[Installations]
    N --> D
    R[未来 Provider/Admin receipts] -.作为新 observation 升级同一 event.-> O
```

核心边界：

- Adapter 负责“这个客户端字段是什么意思”，不负责决定公开分数。
- API 负责认证、幂等、observation 落库、canonical event resolution、归一化和风控，不信任客户端 total、cost 或 canonical event key。
- `usage_observation` 保存“谁、通过哪个 Adapter、在什么批次观察到什么”；它不可变且可审计。
- `canonical_usage_event` 保存“服务端认为这是哪一次唯一消费”；多个 observation 可以指向同一 event。
- `canonical_event_head` 保存该 event 当前有效 revision、归一化 Token、可信度和风险状态。
- Rollup 通过事务 outbox 更新，是可从 canonical heads 重建的缓存，不是事实源。
- Evidence Ledger 只保存最小必要证据和 revision，不保存工作正文。
- X identity、participant、installation、observation 和 canonical event 是五个不同概念。

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

每条 Token observation 及其 canonical event head 还必须保存语义元数据：

```text
token_unit_kind: provider_reported_token
modality_scope: text | multimodal | image | audio | video | unknown
reasoning_relation: subset_of_output | separate_from_output | unknown
tool_prompt_relation: subset_of_input | separate_from_input | unknown
```

如来源提供可靠细分，可附带 `input_modality_tokens`、`output_modality_tokens` 和 `tool_prompt_tokens`；这些是诊断维度，不得在未声明 relation 时直接加进 input/output total。全局榜比较的是 Provider 报告的 Token 单位，不宣称不同 tokenizer、图片、音频或文本 Token 具有相同工作量。

定义：

- `input_total_tokens`：完整有效输入，包含 cache read 和 cache creation，但每个 Token 只出现一次。
- `cache_read_tokens`：从 Provider prompt cache 复用的输入，是 input total 的子集。
- `cache_write_tokens`：本次新处理并写入缓存的输入，是 Fresh Input 的组成部分；不得在 input total 之外再次相加。
- `output_total_tokens`：Provider 计入本次生成/计费的全部输出。若 reasoning/thinking 已包含在 output 中，不得再次相加。
- `reasoning_tokens`：用于细分展示的诊断字段；由 `reasoning_relation` 明确它是 output total 的子集、独立分量或未知。未知时不得通过猜测相加。

标准公式：

```text
input_uncached_tokens = max(input_total_tokens - cache_read_tokens, 0)

fresh_tokens = input_uncached_tokens + output_total_tokens

raw_tokens = input_total_tokens + output_total_tokens

cache_hit_rate = cache_read_tokens / input_total_tokens
```

当 `input_total_tokens = 0` 时，cache hit rate 为 `null`，不是 0%。

归一化不变量：

```text
0 <= cache_read_tokens <= input_total_tokens
0 <= cache_write_tokens <= input_uncached_tokens
reasoning_relation = subset_of_output  => reasoning_tokens <= output_total_tokens
reasoning_relation = separate_from_output => output_total_tokens 已显式包含 reasoning_tokens
```

如果 Provider 的字段关系无法满足这些不变量，observation 保留但 canonical event 进入 `provisional` 或 `quarantined`，不得进入 Fresh 榜。

### 7.3 Provider 映射

| Provider 语义 | 归一化方式 |
|---|---|
| OpenAI | `input_total = input_tokens`；`cache_read = input_tokens_details.cached_tokens`；`output_total = output_tokens` |
| Anthropic | `input_total = input_tokens + cache_creation_input_tokens + cache_read_input_tokens`；`cache_write = cache_creation_input_tokens`；`cache_read = cache_read_input_tokens` |
| Gemini | `input_total = promptTokenCount`；`cache_read = cachedContentTokenCount`；`output_total = candidatesTokenCount + 独立 thoughtsTokenCount`；`toolUsePromptTokenCount` 只有在 fixture 证明未包含于 prompt 时才按独立 input 分量处理 |
| 无 cache 且语义明确 | `cache_read = 0`；Fresh 与 Raw 相同 |
| 只有 total、无分项 | `fresh_tokens = null`，不得进入 Fresh 榜 |

OpenAI 官方说明 input token 总量包含 cached tokens；Anthropic 官方要求把普通输入、cache creation 和 cache read 相加得到总输入；Gemini 官方说明 prompt token count 包含 cached content，total token count 包含 prompt、thoughts 和 response candidates。Adapter 必须按 Provider 语义构建互斥口径，不能只按字段名称猜测。Gemini fixture 应在适用版本断言 normalized total 与官方 `totalTokenCount` 一致；不一致时标记 schema/semantics mismatch。

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

- 每个 canonical event head 记录 `pricing_version`、价格生效日期和 pricing context；支持显式重算时保留旧版本审计。
- 未知模型、未知 Provider 或未知费率时金额为 `null`，禁止使用统一 fallback price。
- 定价匹配键至少包含 provider、canonical model、费率生效区间，并按实际来源补充 service tier、batch、region、cache TTL、billing mode 和 Provider tool fee 语义；缺少影响价格的上下文时金额为 `null`。
- `price_coverage_token_weighted` = 已知费率的可计费 Token bucket 数 / 全部可计费 Token bucket 数；`price_coverage_request` = 金额完整的 eligible request 数 / 全部 eligible request 数。两者都必须返回，禁止只用请求数掩盖大额未知用量。
- Cost 榜首发门槛暂定 `price_coverage_token_weighted >= 95%`；95% 是待 shadow 数据校准的 provisional threshold，UI 同时显示两种 coverage。
- 汇率只用于未来 actual billing 的展示，必须记录原币、汇率来源和日期。

## 8. Evidence Ledger

### 8.1 Observation、Canonical Event 与 Head

V2 明确区分三个层次：

1. `usage_observation`：某个 installation 在签名批次中提交的一次不可变观察。它保存来源、Adapter/schema 版本、最小 Token 分项和签名 provenance。
2. `canonical_usage_event`：服务端解析出的唯一模型消费事实。多个客户端、文件或 receipt 的 observation 可以指向同一个 canonical event。
3. `canonical_event_head`：该 event 当前有效的归一化版本、归属 participant、可信度、风险状态和可计分贡献。

客户端永远不能直接指定数据库 canonical event ID。客户端只能提交允许的稳定 ID digest、namespace 和 observation；服务端按 Registry 中的 Adapter 规则解析或关联 canonical event。

### 8.2 证据粒度与时间精度

支持三种粒度：

1. `request_event`：首选。一次真实模型请求对应一个 canonical event，可由多个 observation 共同证明。
2. `session_revision`：客户端只提供累计 Session 用量时，同一 Session 使用 revision/head 语义。
3. `aggregate_snapshot`：最低时间精度。累计快照只用高水位差值，不允许每次扫描都把全量重新相加。

当前聚合 Collector v2 迁移协议（Evidence Ledger 全量上线前的兼容层）严格使用 no-delete high-water 语义：不接收 `deleteKeys` 或其他聚合行删除指令，本次扫描缺少的行不代表删除。首次 cutover 仅在原子提交时替换 cutover 日及之后的 legacy 行；后续 incremental 与 full reconciliation 都只做不减 high-water upsert。

每条 observation 必须声明：

```text
occurred_at
period_start
period_end
observed_at
time_precision: request | session | aggregate_snapshot
```

- Request 级事件使用真实请求发生时间。
- Session revision 没有逐请求时间时，新增差值归属于本次 revision 的 `observed_at`，不得全部回填到 session 开始日。
- Aggregate snapshot 只能进入与其时间粒度匹配的范围；无法准确切分到日时，不进入 today/3d/7d 日级榜。
- 服务端同时保存 `ingested_at`；客户端时间只用于业务归属，不能替代服务端重放、回溯和时钟异常判断。

### 8.3 最小 Observation 字段

```json
{
  "schemaVersion": 2,
  "evidenceKind": "request_event",
  "eventNamespace": "anthropic.request",
  "sourceScopeDigest": "sha256:...",
  "sourceEventIdDigest": "sha256:...",
  "sourceRevision": "1",
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
  "tokenUnitKind": "provider_reported_token",
  "modalityScope": "text",
  "reasoningRelation": "subset_of_output",
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

### 8.4 Canonical Event Identity 与全局去重

去重发生在 participant 归属和 Rollup 之前。namespace 表示“ID 由谁定义”，而不是“谁观察到了它”。

客户端对允许的高熵 source ID 使用固定算法：

```text
source_event_id_digest = SHA256(
  "tokenrank-source-id-v2\n" + event_namespace + "\n" + stable_source_event_id
)

source_scope_digest = SHA256(
  "tokenrank-source-scope-v2\n" + scope_namespace + "\n" + stable_high_entropy_scope_id
)
```

`stable_source_event_id` 和 scope 原值永不上传；同一 Provider request 的不同客户端 Adapter 必须使用 Registry 中相同的 event/scope namespace 和字符规范化规则，否则不能声称跨客户端 exact dedupe。

Provider request ID 的优先键：

```text
canonical_event_key = SHA256(
  "tokenrank-canonical-event-v2\n" +
  "provider_request\n" +
  provider_event_namespace + "\n" +
  source_scope_digest + "\n" +
  source_event_id_digest
)
```

`provider_event_namespace` 示例为 `openai.response`、`anthropic.request`、`google.generate_content`。它不包含 `client_key`，因此同一 Provider request 被 IDE、插件、Gateway 或 export 观察时仍映射到同一个 canonical event。

Client Session 或 aggregate 没有 Provider event ID 时使用客户端自身 namespace：

```text
session_event_key = SHA256(
  "tokenrank-canonical-event-v2\n" +
  "client_session\n" +
  client_namespace + "\n" +
  source_scope_digest + "\n" +
  stable_session_id_digest
)
```

Aggregate snapshot 使用单独 namespace，避免与 Session 混淆：

```text
aggregate_snapshot_key = SHA256(
  "tokenrank-canonical-event-v2\n" +
  "aggregate_snapshot\n" +
  client_namespace + "\n" +
  source_scope_digest + "\n" +
  metric_scope + "\n" +
  aggregate_scope_digest
)
```

`aggregate_scope_digest` 只能表示来源定义的稳定、非重叠 bucket（例如固定 UTC 日）或固定起点的 lifetime counter；`period_end` 是 revision 属性，不进入 key。无法证明窗口不重叠的 rolling summary 不做高水位差值，只能进入 Activity/诊断。改变文件、installation 或 X 账号不会创建新计分桶。

没有任何稳定 ID 时只允许使用 Adapter 定义的组合指纹候选：

```text
provider + model + occurred_at + token buckets +
stable session digest + request sequence
```

组合指纹命中时默认生成 `possible_duplicate` 风险或按明确 source precedence 关联，不能声称强全局去重。文件路径、JSON 行号、`sourceRecordId`、X 账号或 installation ID 不得进入跨来源 canonical key。

`source_scope_digest` 与 source event/session digest 规则：

- 只允许由高熵、非邮箱、非 handle、非可枚举用户名的稳定 ID 生成；无安全 ID 时留空。
- Registry 对每个 event namespace 固定 `scope_mode: required | forbidden`；若 Provider event ID 已全局唯一，则所有 Adapter 都禁止附加 scope；若 ID 只在账号内唯一，则所有 exact Adapter 都必须产生相同 scope namespace/digest。不能由某个客户端自行选择是否带 scope。
- digest 必须包含固定 domain 和 ID 类型，避免不同 namespace 的相同字符串碰撞。
- digest 属于假名化、可关联数据，按个人数据访问控制，不公开、不进入普通业务日志。
- 低熵 ID 不得使用裸 SHA-256 冒充匿名化；无法安全处理时放弃该 scope 的跨账号去重。
- 恶意客户端可以改写 ID 或 digest，因此该机制能阻止诚实重复和低成本复制，不等于 Provider Verified。

### 8.5 Session Revision

OpenClaw、Hermes 等 Session 累计记录使用：

```text
canonical_event_key = 按 §8.4 client_session 公式生成的 session_event_key
source_revision = 来源提供的单调、不可包含正文的 opaque string（最长 128 bytes）；没有时为 source_updated_at + installation batch sequence
cumulative_usage = 当前累计 Token 向量
```

服务端在锁定 event head 后比较新旧 revision：

- revision 更新且所有累计 Token 分量单调不减：计算正向差值并生成新 head。
- 相同 revision、相同 payload digest：返回 duplicate/idempotent。
- 相同 revision、不同 Token：记录 `revision_conflict` 并隔离。
- revision 更新但累计值减少、来源时间倒退或 lineage 语义不明：保留 observation，canonical head 不前移。
- 没有稳定 Session ID 的累计结果不能伪装成 `session_revision`，只能作为 aggregate snapshot。

Session 跨天时，只有来源提供逐请求时间或官方 daily aggregate 才能精确分日。否则增量按 revision 的观测时间入账，并标记 `time_precision=session`；UI 和 API 必须返回时间精度。

### 8.6 多 Observation、冲突与来源优先级

- 所有通过签名和隐私 schema 的 observation 都不可变落库；duplicate observation 仍保留 provenance，但不新增计分。
- Registry 为每个 event namespace 定义 `source_precedence`，例如 Provider receipt > 官方 request telemetry > 官方客户端本地 usage > aggregate snapshot。
- 高优先级 observation 可升级 trust 或修正 canonical head，但不得生成第二份 Token。
- 两个同级 observation 数值不一致时进入 `observation_conflict`，保留双方数据和 Adapter 版本，不静默选择更大的数。
- 同一 canonical event 被不同 participant claim 时产生 `cross_participant_claim`；ownership 不属于 canonical key。冲突 event 对双方都不进入公开榜，响应不泄露对方身份；Provider Verified observation 可解决归属，否则进入恢复/申诉审计。
- Provider/Admin receipt 在 Roadmap C 中作为新 observation 附着到既有 canonical event，升级 trust 和 actual billed cost，不新增消费事件。

### 8.7 Head 状态转换与 Rollup Outbox

任意会影响公开分数的更新都必须在一个数据库事务中完成：

```text
1. 锁定 canonical_event_head
2. 验证 observation、revision 和状态转换
3. 记录旧的可计分 contribution
4. 追加不可变 observation/revision
5. 更新 canonical_event_head
6. 写入包含 old/new contribution 的 rollup_outbox
7. 提交事务
```

Rollup worker 以 outbox ID 幂等消费：先撤销旧 contribution，再应用新 contribution。accepted → quarantined、quarantined → accepted、participant merge、定价重算和 trust upgrade 都走同一机制，禁止直接修改榜单数字。Outbox 消费失败只造成 `rollup_lag`，不能丢失 Ledger 事实；系统必须支持按 canonical heads 全量重建并与增量 Rollup 对账。

### 8.8 多 Agent 与子 Agent

- 子 Agent 发起独立模型请求时正常计数。
- 父任务的汇总、编排记录和 Session snapshot 不重复计数。
- Provider attestation 未来只升级已有 canonical event 的 trust，不再新增第二条消费记录。
- 同一次请求通过多个来源观察时只产生多个 observation，最终仍只有一个 canonical event head。

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
6. 两个已经存在的 participant 不能因为同一 installation 或粗粒度网络信号自动合并；只能进入显式 merge/recovery 流程。

### 9.3 Installation Key

- 首次接入生成 Ed25519 keypair。
- 私钥优先保存在系统用户级安全存储：Windows 使用 OS 用户绑定的保护能力，macOS 使用 Keychain，Linux 使用可用的 Secret Service；不可用时才降级为当前用户权限的本地文件。
- 服务端保存 public key 和全局唯一 fingerprint。
- 每个批次包含 batch ID、单调 sequence、payload digest 和签名。
- 同一 public key fingerprint 只能归属一个 participant。
- Installation 保存 `key_storage_capability: os_protected | user_file | unavailable`；降级不会改变 Token 数值，但会进入 trust/risk 元数据。

签名证明“这批数据来自同一个 installation”，不能证明本地日志真实。开源客户端和本机管理员仍可伪造数据，因此本地签名不是 Verified。

### 9.4 Participant Merge、身份恢复与 Key Rotation

三类流程必须分开建模：

```text
participant_merge_request:
  requested -> proof_pending -> cooling_down -> approved | rejected | cancelled

identity_recovery:
  requested -> oauth_or_manual_proof -> risk_review -> recovered | rejected

installation_key_rotation:
  requested -> old_key_proof | account_recovery_proof -> activated -> old_key_revoked
```

- `participant merge`：用于用户已经通过不同 X 创建两个 participant 的场景。正常路径要求同时控制两个 participant 的已链接 OAuth identity；无法同时控制时进入人工恢复，不因名称、IP 或设备相似自动合并。
- Merge 执行时保留原 participant alias 和完整审计记录；auth identities、installations 和 canonical event ownership 迁移到 survivor participant，Rollup 通过 outbox 重建。相同 canonical event 仍只计一次。
- 两个 participant 的公开国家不一致时，merge 后国家进入重新选择和冷却期，历史 country membership 不改写。
- `key rotation`：正常轮换由旧私钥签名新 public key；旧 key 遗失时要求已登录 participant 再次 OAuth、撤销旧 credential，并经过冷却或风险检查。
- 系统重装或新电脑创建新的 installation，不继承旧 sequence；仍存在的原始 evidence 可回放，但必须生成相同 canonical event identity，因此不会重复计分。
- 所有 merge、recovery、key rotation、credential revoke 和管理员动作保存 actor、reason、before/after、时间和规则版本；高风险恢复在完成前保持 provisional。

### 9.5 多设备和共享场景

- 同一 participant 的合法多设备全部允许同步，不再依赖“只计算最高三台设备”作为主要防线。
- 30 天内新增超过 3 个 installation 暂定触发软风险检查，但不自动丢弃真实用户数据；该阈值是 shadow 期需要校准的 provisional policy。
- 不同 OS 用户有不同 key，因此共享物理电脑可以合法区分。
- 同一 OS 用户目录由多人共用时，不支持公平的个人归属；应选择 Team/Automation 类型或分离系统用户。
- CI、团队共享账号、批量服务器和机器人不进入个人榜；未来进入 Team/Automation 榜。

## 10. 反作弊与风险系统

### 10.1 可信度等级

| 等级 | 内部值 | 含义 | 是否进入 Token 榜 |
|---|---|---|---|
| 目录 | `catalog_only` | 只有平台收录 | 否 |
| 自报 | `self_reported` | 手工导入或不可验证汇总 | 仅 Legacy/Activity |
| 本地结构化证据 | `local_structured` | 官方客户端本地 usage、SQLite、只读统计 API | 通过 eligibility 后可进入，标 Local Evidence |
| 官方客户端遥测 | `official_client_telemetry` | 例如经过隐私过滤的 Cowork OTel | 通过 eligibility 后可进入，标 Official Telemetry |
| Provider Verified | `provider_verified` | Provider/Admin usage 或账单 receipt | Roadmap C，当前待开放 |

### 10.2 数据状态

Observation 输入状态：

```text
stored        签名、隐私和 schema 合法，已不可变保存
duplicate     已关联同一 canonical event/revision，不新增计分
conflict      revision、数值或 ownership 冲突，等待解析
rejected      协议、签名、隐私或字段不合法，不进入 Ledger 事实层
```

Canonical event head 状态：

```text
accepted      通过 eligibility，可进入对应榜单
provisional   个人 Dashboard 可见，公开榜暂不计分
quarantined   隔离等待自动复核或申诉
blocked       管理员确认的 installation/participant/event 禁止计分
```

### 10.3 威胁与控制

| 威胁 | 主要控制 | 剩余限制 |
|---|---|---|
| 同一日志换多个 X 提交 | participant/identity 解耦、installation 全局绑定、canonical event 全局唯一 | 删除安装并伪造新 ID/digest 仍需风险检测 |
| 同一调用被多个客户端观察 | Provider event namespace、canonical event resolution、observation provenance 和 source precedence | 无稳定 ID 时组合指纹可能碰撞或漏重 |
| 重复上传同一批次 | batch ID、sequence、签名和幂等响应 | 恶意用户可生成新批次；只有稳定 canonical ID 才能继续去重 |
| 修改 event/scope digest | domain-separated ID、跨 observation 一致性、scope collision、installation churn 和异常增长检测 | 开源客户端可任意伪造 digest，Local Evidence 不能因此升级为 Verified |
| 修改本地 JSON/SQLite | 版本门控、字段不变量、增长率和时间异常、可信度标签 | 本地证据永远不能达到 Provider Verified |
| 伪造 total 或金额 | 服务端重算 Token 和定价；未知价格为 null | Provider 自身 usage 错误仍会传递 |
| 回拨时钟或历史刷量 | UTC occurred_at、ingested_at、最大回溯 90 天、sequence 单调检查 | 离线设备需允许合理时钟误差 |
| 反复重装刷设备 | installation churn、账号/网络粗粒度风险、隔离 | 不使用硬件指纹，因此无法彻底阻止高对抗用户 |
| 故意关闭 cache 刷 Fresh | cache 命中率、请求速率、输入/输出比、活跃天数与异常跳变 | 不读取内容，无法判断工作是否有价值 |
| 超大 Token/超频请求 | 按模型上下文上限、请求数、分钟/小时/日增长率检测 | 模型上限和 Agent tool-loop 需要版本化规则 |
| 国家榜跳区 | 公开国家变更冷却、粗粒度 geo 信号、多日一致性 | VPN 和旅行不会被自动当作弊 |

### 10.4 风险评分原则

- 风险规则按类别公开，具体阈值不全部公开，避免直接提供刷榜参数。
- 单一信号不直接封号；高风险 canonical event/ownership claim 先隔离。
- 每个 risk event 保存规则版本、证据、状态和管理员动作。
- 用户能看到“有数据未计入”及大类原因，并可重新扫描或申诉。
- 申诉恢复后重新生成 Rollup，不直接手改榜单数字。
- 新规则和新阈值先运行 `shadow` 模式，只记录如果启用会影响哪些 observation/event，不改变公开排名；达到预设误报预算后才转 enforce。
- 95% price coverage、installation churn、Cache Efficiency 最小样本和国家冷却期均为 provisional threshold，必须记录基线、命中分布、申诉推翻率和调整历史。
- 管理员查看风险详情、解除隔离、合并 participant 或封禁时使用最小权限 RBAC，并写不可变审计日志；禁止直接编辑 Rollup 分数。

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

工程优先级与公开统计成熟度分开。每个 client/surface 独立维护：

```text
integration_status:
  catalog       仅目录收录
  research      已发现候选来源，字段/隐私/重复语义未完成
  fixture_ready 已有脱敏真实 fixture 和语义说明，尚未公开计分
  preview       小范围上传和 shadow 计分
  exact         通过版本门控、隐私、去重和重建验收，可进入对应 Token 榜
  disabled      因 schema 漂移、隐私或准确性问题被 kill switch 停止计分
```

P0/P1/P2 只决定先研究谁，不自动把平台提升为 `exact`。状态按 `client_key + surface + client_version + source_schema_version` 管理。

### 11.2 P0：优先完成专用 Adapter

| Canonical key | 定位 | 候选数据 | 初始状态 | V2 要求 |
|---|---|---|---|---|
| `codex` | Coding Agent | request usage、input/output/cache | `research`；V1 Legacy 已有 | 替换工具级特判，使用 Provider 语义 fixture |
| `claude-code` | Coding Agent | input/output/cache creation/read | `research`；V1 Legacy 已有 | 专用 JSONL Adapter，禁止通用递归猜测 |
| `openclaw` | Personal/Work Agent | session-log usage/cost summary、可能的只读 RPC、多 Agent | `research`；usage-cost 先视为 aggregate | `gateway usage-cost --all-agents --json` 官方只承诺 summary；只有 fixture 证明稳定 Session revision 或 request ID 后才升级粒度，禁止读取 transcript 正文 |
| `hermes-agent` | Personal/Work Agent | input/output/cache/reasoning、Provider、source、estimated/client-reported cost | `research` | 仅允许审计后的 analytics usage API 或 allowlist 查询 `state.db`；验证 SQLite 运行时能力，禁止 generic session API、`SELECT *` 和 messages 表 |
| `codebuddy-code` | Coding/Work CLI | `/cost` 展示、stats 端点、可能的 usage-data | `research` | 官方文档未固定 stats response schema；真实 fixture、版本白名单和未知字段拒绝完成前不得宣称 exact |
| `gemini-cli` | Coding Agent | prompt/cache/candidate/thought usage | `research` | 按 Gemini UsageMetadata 语义建立专用 Adapter，并验证 tool-use prompt 与 totalTokenCount |

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
| `claude-cowork` | Work Agent、受控 OTel 试点 | 只有本地先过滤到 `api_request`，以本地 digest 的 `session.id + event.sequence + event.name` 去重，并删除 prompt、tool_input、path、email 后才可上传 |
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
registry_releases
```

Web 提供只读 `/api/v2/clients`；CLI 内置独立 fallback manifest，并可读取兼容的远端 registry。每个 registry release 包含单调版本、协议兼容范围、生成时间、内容 digest 和 Ed25519 签名；CLI 固定 registry signing public key，只接受比 last-known-good 更新且签名有效的版本。签名失败、版本回退或 API 不兼容时使用 last-known-good/fallback 并 fail closed，不启用新 Adapter。CLI 不导入 Web 代码。

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

服务端先应用统一 eligibility matrix，再聚合排序：

| 维度 | Fresh 主榜要求 | Raw/诊断榜要求 |
|---|---|---|
| `evidence_kind` | request_event；语义明确的 session_revision | request/session；时间范围匹配的 aggregate_snapshot |
| `integration_status` | `exact` | `preview` 只在个人 Dashboard；公开榜仍要求 `exact` |
| `semantic_coverage` | input/cache/output 关系完整，Fresh 可重算 | Raw 所需 input/output 关系完整 |
| `time_precision` | 与所选 range 匹配 | API/UI 明示精度限制 |
| `modality_scope` | 默认 text；multimodal 需显式标记并可筛选 | 可展示，但不得伪装成纯文本同口径 |
| `trust_level` | local_structured 或更高 | self_reported 只进 Legacy/Activity |
| `risk_status` | accepted | provisional/quarantined 不进入公开榜 |

Eligibility 结果和排除原因必须能按 canonical event 重放，不把复杂资格逻辑只写在排行榜 SQL 中。

| 榜单 | 排序值 | 资格说明 |
|---|---|---|
| Provider-reported Fresh Tokens | `fresh_tokens` | 默认 30d 主榜；通过上述 eligibility，Fresh 不明的 event 不进入 |
| Raw Tokens | `raw_tokens` | 展示全部输入含 cache read 与输出 |
| Output Tokens | `output_total_tokens` | 展示生成侧用量 |
| Cache Reuse | `cache_read_tokens` | 展示绝对复用量 |
| Cache Efficiency | `cache_read / input_total` | 首发暂定至少 1M input 且 3 个活跃日；阈值经 shadow 基线校准 |
| Cache Write | `cache_write_tokens` | 诊断缓存建立成本，不作为默认主榜 |

Fresh Tokens 不是生产力分数，也不是跨 tokenizer、跨模态的等价工作量。它能避免 cache read 重复放大，但可能激励用户关闭缓存；因此公开详情必须同时显示 Raw、Cache Hit、Output、活跃天数和 trust。Provider Verified 榜开放前不得以 Fresh 名次发放现金、奖品或其他高价值利益。

### 12.3 金额榜

- 默认使用 `estimated_list_usd`，标题必须带“Estimated”。
- `price_coverage_token_weighted` 低于首发 provisional 95% 不进入排名；Dashboard 同时显示 token-weighted 和 request coverage。
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
integration_status
token_unit_kind
modality_scope
time_precision
```

OpenClaw/Hermes 的 Agent、profile 或 channel 不上传可识别名称，只允许上传稳定本地哈希或枚举 channel type；公开页面默认只展示汇总数量和类型。

### 12.5 国家/地区榜

- 用户可选一个公开 `country_code`，使用 ISO 3166-1 alpha-2；`ZZ` 表示未设置。国家选择保存为 `participant_country_history(valid_from, valid_to)`，不是覆盖一个当前字段。
- Cloudflare/边缘层只产生粗粒度国家信号，应用数据库不保存完整 IP。
- 国家榜按 canonical event 的 occurred_at 对应的公开 country membership 归属；修改国家不会搬迁历史 Token。geo 信号只用于内部 confidence 和风险，不直接覆盖用户选择。
- 用户修改公开国家后，首发暂定 30 天内不进入国家榜，但仍进入全球榜；冷却时长是根据误报和跳区数据校准的 provisional threshold。
- VPN、出差或跨境使用只触发多日一致性检查，不自动处罚。
- 不收集或展示城市、精确位置。

### 12.6 公开展示

公开榜只显示：

- 用户选择的 X 头像、名称和 handle。
- 可选国家/地区。
- 对应榜单分数、活动天数和平台汇总；全局 Token 榜明确标注 `Provider-reported`。
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
| `participant_merge_requests` | 两个既有 participant 的显式合并 | survivor、proof、冷却、决定和审计完整 |
| `identity_recoveries` | 丢失原 X 或 key 时恢复 | 不以设备/IP 相似自动恢复 |
| `installation_key_rotations` | 新旧 public key 交接 | old-key proof 或 account recovery proof，只激活一个 current key |

现有 NextAuth `accounts` 可作为 `auth_identities` 的基础；`users.xId/xHandle` 逐步降级为展示缓存，最终以选定 public identity 派生。

### 13.2 Observation、Canonical Event 与聚合

| 表 | 作用 | 关键约束 |
|---|---|---|
| `submission_batches` | 批次签名、sequence、canonical payload digest、幂等响应 | installation + sequence 唯一；batch_id 全局唯一 |
| `usage_observations` | 签名批次中的不可变来源观察 | batch + observation_index 唯一；禁止 UPDATE Token 字段 |
| `canonical_usage_events` | 跨客户端唯一消费事实 | canonical_event_key 全局唯一；不以 participant/client 作为 Provider request namespace |
| `event_observation_links` | 多个 observation 到 canonical event 的 provenance | observation 唯一归属一个解析结果；保留 precedence/conflict |
| `event_ownership_claims` | participant 对 canonical event 的归属声明 | 同 event 跨 participant claim 触发隔离，不自动 first-wins |
| `canonical_event_revisions` | Session/aggregate revision 历史 | canonical_event + source_revision + payload_digest 唯一 |
| `canonical_event_heads` | 当前有效 revision、participant、trust、risk 和 contribution | 每个 canonical event 一条 head；状态转换带 version/乐观锁 |
| `rollup_outbox` | old/new contribution 的幂等变更日志 | outbox ID 唯一；同一 head version 只产生一次 |
| `usage_rollups_daily` | 按 participant/date/client/model/trust/modality 聚合 | 可从 accepted canonical heads 重建 |
| `risk_events` | 风险规则命中和处置 | 保存 rule_version 和状态 |
| `participant_country_history` | 公开国家的有效区间 | participant 的有效区间不可重叠；历史不因修改而重写 |
| `country_signals` | 粗粒度 geo confidence | 不保存完整 IP，只保存 country/date bucket/来源 |
| `pricing_versions` | Provider/model/日期与计费上下文价格 | 同一完整 pricing key 的生效区间不可重叠 |
| `client_catalog` | 平台目录与能力状态 | client_key 稳定、alias 单向映射、integration_status 版本化 |
| `registry_releases` | 签名后的远端 Registry | 单调 release version、content digest、签名和兼容范围 |

`usage_observations` 是签名事实，`canonical_event_heads` 是当前解释，`usage_rollups_daily` 是派生缓存。解除隔离、修订价格、升级 trust 或合并 participant 时不得重写 observation；只追加 revision/decision，并通过 outbox 改变 head contribution。

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
POST /api/v2/installations/enroll/challenge
POST /api/v2/installations/enroll
```

1. 已登录 session 向 challenge endpoint 提交 public key fingerprint、CLI 版本、平台和 key storage capability；服务端返回绑定当前 session/participant 的 opaque `enrollment_context_id`、一次性 nonce、过期时间和协议版本。
2. CLI 使用待注册私钥签名 `UTF8("tokenrank-enroll-v2\n" + enrollment_context_id + "\n" + base64url(public_key) + "\n" + nonce + "\n" + expires_at)`，再提交 enroll；客户端不需要获得内部 participant ID。
3. 服务端验证 enrollment context 仍绑定当前登录 session、nonce 一次性、私钥持有和 public key 全局 ownership 后，返回 installation ID、credential ID、初始 sequence 和协议版本。

同一 public key 已归属其他 participant 时不得重新 enrollment，进入 identity conflict。Challenge 过期、重复使用或签名不匹配均拒绝且不创建 installation。

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

`payload_digest` 对 RFC 8785 JSON Canonicalization Scheme 产生的 UTF-8 payload 计算 SHA-256；协议 fixture 固定字段命名、数组顺序和 Unicode 处理。Token、micros、sequence 和 head version 只能使用 `0..2^53-1` 的 JSON integer，禁止浮点、指数、NaN/Infinity；`sourceRevision` 是长度受限的 opaque string；时间使用 UTC RFC 3339。签名输入精确定义为：

```text
signature_input = UTF8(
  "tokenrank-evidence-batch-v2\n" +
  protocol_version + "\n" +
  installation_id + "\n" +
  credential_id + "\n" +
  batch_id + "\n" +
  sequence + "\n" +
  generated_at + "\n" +
  payload_digest
)

signature = Ed25519.sign(private_key, signature_input)
```

- `batch_id` 使用随机 UUID，服务端全局唯一；同一 batch ID 必须返回原幂等结果。
- `sequence` 在 installation credential 内从服务端给定初值严格每次 `+1`；CLI 上传队列必须串行。相同 sequence + 相同 batch/digest 为重放幂等；相同 sequence + 不同内容拒绝并记录冲突；出现 gap 返回 `409 expected_sequence`，客户端先补传或恢复缺失批次。
- Key rotation 创建新 credential，并从服务端返回的新初值开始独立 sequence 空间；旧 credential 只在短期幂等查询窗口响应已提交 batch，不能接受新 batch，也不能把 sequence 延续到未知 key。
- `generated_at` 只用于时钟风险，不替代服务端 `ingested_at`，也不能单独决定批次新旧。

V2 使用 `Authorization: TokenRank-Ed25519 credential_id="...", signature="base64url(...)"`；credential ID 是不可枚举 lookup ID，真正认证因子是 installation 私钥。任何 bearer secret、签名或恢复 token 都不放入 URL path，避免进入浏览器历史、代理访问日志和路由指标。V1 webhook URL 只在兼容期保留。

响应返回：

```json
{
  "status": 0,
  "storedObservations": 137,
  "linkedDuplicates": 14,
  "acceptedEvents": 120,
  "provisionalEvents": 2,
  "quarantinedEvents": 1,
  "rejectedObservations": 0,
  "nextSequence": 83,
  "items": [
    {
      "observationIndex": 0,
      "status": "duplicate",
      "canonicalEventRef": "evt_public_opaque_ref",
      "reasonCode": "provider_event_already_observed"
    }
  ]
}
```

API 必须对同一 batch 返回相同幂等结果。逐条结果只返回不可枚举的 opaque ref 和公开 reason code，不泄露另一 participant、installation 或内部 risk rule 详情。

### 14.3 Registry 与榜单

```text
GET /api/v2/clients
GET /api/v2/leaderboards?metric=fresh_tokens&range=30d
GET /api/v2/leaderboards?metric=fresh_tokens&range=30d&client=openclaw
GET /api/v2/leaderboards?metric=estimated_list_usd&range=month&country=CN
```

API 返回 scoring_version、token unit label、eligibility requirements、trust requirements、integration status、两种 price coverage、time/modality coverage、range cutoff 和 Legacy 标记。

### 14.4 服务端处理顺序

1. 请求体大小、条数、协议版本和速率限制。
2. credential、canonical payload digest、签名、batch ID 和 sequence。
3. 严格字段 allowlist；出现禁用字段整批拒绝并记录客户端 bug。
4. client/schema/adapter version gate。
5. 在事务中不可变写入 usage observations。
6. 按 event namespace 解析 canonical event，建立 observation link，或生成 possible duplicate/conflict。
7. 锁定 event head，比较 revision，执行 Provider 语义归一化和 Token 不变量检查。
8. 计算价格、coverage、eligibility 和风险状态。
9. 更新 canonical event head，并在同一事务写入 old/new contribution 的 rollup outbox。
10. 提交后由幂等 worker 消费 outbox；失败可重试或从 canonical heads 全量重建。

数据库唯一约束和 head version lock 是最终并发防线：两个 participant 同时提交同一 provider event 时，只能创建一个 canonical event；输掉唯一键竞争的事务重新读取 event 并附加 observation，不返回 500 或重复计分。

## 15. CLI 与 Adapter 架构

### 15.1 专用 Adapter 接口

每个 Adapter 必须声明：

```text
client_key
supported_client_versions
source_schema_versions
evidence_granularity
integration_status
event_namespace
provider_semantics
token_unit_kind
modality_semantics
allowed_source_fields
forbidden_source_fields
stable_id_strategy
revision_strategy
source_precedence
privacy_risk
```

未识别版本或 schema 时 fail closed，并在 `tokenrank doctor` 显示“已检测到客户端，但该版本暂不支持精确统计”。禁止回退到通用递归 JSON 猜测。

### 15.2 OpenClaw

优先级：

1. `openclaw gateway usage-cost --all-agents --json`，默认只视为 `aggregate_snapshot`，因为官方能力描述是 session-log usage/cost summary。
2. 只读 Gateway RPC：只有经过真实 fixture 证明返回稳定 Session ID/revision 或 request ID 的 usage endpoints，才可升级为 `session_revision` 或 `request_event`。
3. 不读取 `~/.openclaw/agents/<agent>/sessions/*.jsonl` 正文作为正式方案。

原因：OpenClaw usage surface 提供归一化 input/output/cache/cost 候选字段，但公开 CLI summary 不等于 request-level evidence；原始 transcript 同时含 prompt、回复和工具调用。金额映射为 estimated 或 client-reported，不是 actual billed。

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

CLI 当前最低 Node 版本不能假定所有环境都具备可用的内置 SQLite。Hermes Adapter 启用前必须由 `tokenrank doctor` 验证：只读 `node:sqlite` 可用，或系统 `sqlite3` 可用且支持 JSON 输出；两者都不可用时只报告“检测到 Hermes，但缺少安全 SQLite reader”，不得静默返回 0 Token。是否提升最低 Node 版本、使用系统能力或引入依赖必须在 Hermes 独立实现计划中明确决策。

### 15.4 CodeBuddy Code

- 首选 `/cost` 对应的结构化统计、`/api/v1/stats` 和 `/api/v1/stats/session`，但官方文档只证明端点存在，没有固定 Token response schema；抓取脱敏响应 fixture 前保持 `research`。
- `~/.codebuddy/usage-data/` 只有在脱敏真实 fixture、版本白名单和未知字段拒绝策略完成后才能启用，不能因目录存在就自动上传。
- 本地 HTTP API 仍是 Beta，Adapter 必须记录 CodeBuddy 版本并使用 schema 白名单。
- 不调用 transcript、文件系统、trace 详情等包含正文或路径的端点。

### 15.5 Claude Cowork

Cowork OTel 的 `api_request` 能提供 input、output、cache read、cache creation 和 estimated cost，但同一遥测流的其他事件可能包含 prompt、tool_input、文件路径和邮箱。

因此只允许受控试点：仅面向具备管理员 OTel 配置能力的 Team/Enterprise，Claude Desktop 版本至少为 1.1.4173。用户必须在本地 OTel Collector 使用 outbound positive allowlist，只保留：

```text
event.name = api_request
event.timestamp
event.sequence
session_id_digest（由 session.id 在本地转换，原值不上传）
model
cost_usd
duration_ms
input_tokens
output_tokens
cache_read_tokens
cache_creation_tokens
speed
```

Cowork `event.sequence` 只保证 Session 内顺序，因此 canonical session event key 必须使用 `cowork + session_id_digest + event.sequence + event.name`，不能只用 sequence。所有其他 event、resource、scope 和标准属性均在本地删除，包括原始 `session.id`、`user.email`、`workspace.host_paths`、prompt 和 tool_input。`cost_usd` 映射为 `estimated_list_usd` 或 `client_reported_cost_usd`，不能进入 verified billed cost。TokenRank 不直接接收完整 Cowork OTel；该能力排在 P1，不阻塞 V2 首发。

### 15.6 CLI 独立性

- Runtime 优先零第三方依赖；Ed25519、HTTP、SQLite 可行性先检查 Node 标准库和现有系统能力。
- CLI 维护自己的 Adapter/Registry manifest，通过协议测试与 Web 对齐，不导入 Web 仓库代码。
- CLI 实现与 Web 共享协议 fixture 而不是共享源码：JCS payload、SHA-256 digest、Ed25519 signature、event namespace 和错误码必须通过同一 golden vectors。
- Key storage 按 Windows OS user protection、macOS Keychain、Linux Secret Service 分平台 Adapter；无法使用时降级为权限收紧的 user file，并在 doctor/上传元数据中标明 capability。
- Registry 远端更新只接受固定 public key 签名和单调版本；失败时保留 last-known-good，禁止无签名热更新解析规则。
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
event namespace 与 ID 类型
Adapter、客户端和 schema 版本
source channel type 枚举
高熵 source scope 的不可逆 digest
token unit / modality / time precision 枚举
estimated/client-reported cost
签名与 sequence
```

所有 source scope、event 和 session digest 都属于假名化、可关联数据，而不是“完全匿名数据”。它们只对去重、申诉和安全服务开放；不出现在公开 API、普通分析日志、客服截图或客户端错误消息。低熵用户名、邮箱、handle、电话号码、路径或可枚举 ID 即使哈希后也不在允许范围。

### 16.3 保留周期

- 当前 canonical event head 和支撑它的最小 observation provenance：随参与者排行榜历史保留，用于全局去重和 Rollup 重建；仅包含时间、client/provider/model、Token 分项、状态、namespace 和不可逆 digest。
- 已被替代的 observation/revision、submission batch envelope、签名和幂等响应：首发暂定 180 天，用于申诉、并发冲突和重复分析；保留期需经隐私与申诉 SLA 评审后确定。
- 去重 tombstone：账号或 canonical event 删除后继续保留不可逆 event key 首发暂定 180 天，防止立即重放；不保留 participant 链接、observation provenance 或 Token 明细。
- Risk signals：90 天；管理员确认的封禁记录按安全审计要求保留。
- 公开国家 membership history：账号存在期间保留有效区间；Country geo confidence signal 只保留 country code 和日期桶 90 天。
- Daily Rollup：用户未删除账号时长期保留，并可由仍有效的 canonical event heads 重建。
- 请求传输层不可避免地会到达边缘节点，但应用、数据库和可查询业务日志不保存完整 IP；应用只接收边缘产生的 country code。
- 用户删除账号后删除身份、installation、country membership、participant-linked observations 和 Rollup；canonical event 中与其他合法 participant/Provider observation 共享的全局事实先解除该 participant 链接，再按数据最小化策略处理。不可逆反滥用 tombstone 按上述周期自动过期。

## 17. 迁移方案

### Phase 0：冻结口径并建立对照

- 将当前榜明确标记为 `V1 Raw / Legacy`。
- 停止继续修改 V1 total 的历史含义。
- 建立 V1 与 V2 shadow 统计仪表，记录差异但不改变公开榜。
- 移除用户文案中把 V1 称为 Verified 或精确审计的暗示。

### Phase 1：指标、Registry 与身份基础

- 新增 Provider 语义归一化库和 golden vectors。
- 建立签名 client registry release、catalog/alias/integration status，停止新增 PostgreSQL tool enum。
- 将 participant 与 X identities 解耦。
- 新增 installation key、全局 ownership、merge/recovery/key rotation 和冲突流程。
- 新增 participant country membership history 和 pricing context/version 模型。

### Phase 2：签名 API、Observation、Canonical Event 与 Ledger

- 新增 challenge-response enrollment、JCS payload、Ed25519 签名 batch 和跨平台 golden vectors。
- 新增不可变 usage observations、canonical event resolution、canonical event heads、revision/conflict、风险状态和 rollup outbox。
- 对 canonical heads 运行全量重建，与 outbox 增量 Rollup 对账；不一致时 V2 保持 shadow，不开放公开榜。
- V1 API 从 V2 GA 起继续接受旧 CLI 90 天，但只写 Legacy，并返回明确的 deprecation/upgrade 提示；90 天后停止 V1 写入。
- 新 CLI 同时可预览 observation、canonical resolution、eligibility 和服务端处理结果。
- V2 发布并完成迁移窗口后撤销 URL path 中的 V1 webhook credential，上传秘密只通过 V2 header/签名协议传递。

CLI 升级必须原子替换后台任务配置并写入 `collector_protocol=v2`。同一机器旧进程仍上传 V1 时只产生 Legacy aggregate，新进程只上传 V2 observation；服务端永远不把 V1 daily aggregate 转入 V2 canonical events，因此双运行不会在 V2 重复计分。CLI doctor 检测到两个调度器或两个协议进程时明确告警并给出安全清理路径。

### Phase 3：P0 Adapter

按顺序交付：

1. Codex / Claude Code 现有来源改成专用 Adapter。
2. OpenClaw。
3. Hermes Agent。
4. CodeBuddy Code。
5. Gemini CLI。

每个 Adapter 独立从 research → fixture_ready → preview → exact 灰度，不因平台已被目录收录或列为 P0 就自动开放 Token 榜。

### Phase 4：V2 榜单和国家维度

- 默认切换到 30d Provider-reported Fresh Tokens。
- 开放 Raw、Output、Cache、Estimated USD、Client、Country 和 V2 All-time。
- V1 保留单独 Legacy 入口。
- Verified Tab 显示“待开放”。

### Phase 5：扩大目录和原生指标

- WorkBuddy、QClaw、Qoder/QoderWork、TRAE、Claude Cowork、Baidu Comate 等按能力进入 Token、Credit、Task、Session 或 Activity 榜。
- Credits 不跨平台混排，除非同一平台有明确同口径。

### Roadmap C

- Provider/Admin usage、账单和 receipt 连接。
- 将 receipt 作为 observation 附着到既有 canonical event，升级为 Provider Verified。
- Verified 榜有至少一个真实 Provider source 后才开放排名，不提前用名称包装本地证据。

### 历史回算

- V2 上线时允许从仍存在的原始本地证据回放最多 90 天；90 天是首发 provisional 窗口，最终由数据量、隐私和运营成本确认。
- 回放必须生成与正常扫描相同的 event namespace、source ID digest 和 canonical event identity，避免新旧设备重复。
- 只有 daily aggregate、没有原始 request/session evidence 的 V1 数据不能进入 Fresh 或 Verified 榜。
- V2 all-time 从 cutoff 起算，并在 UI 显示起始日期。

### 上线 Gate 与回滚

V2 公开榜切换前必须同时满足：

```text
incremental_rollup == full_rebuild
cross_participant_duplicate_race 无重复计分
signature golden vectors 三平台通过
禁用字段 canary 泄漏为 0
至少 Codex 与 Claude Code 达到 exact
风险规则 shadow 误报率和申诉推翻率在批准预算内
```

回滚只关闭 V2 公开查询和 Adapter `exact` 状态，不删除 observations/canonical events、不把 V2 数据回写 V1，也不恢复 URL path credential。修复后从 Ledger 重建 Rollup，再重新开放；不得通过回滚修改历史事实。

## 18. 错误处理与运营机制

- Adapter 不识别 schema：停止该来源、保留其他来源上传，并输出明确 doctor 诊断。
- 某条 canonical event 无 Fresh 口径：observation 仍保留，可进入 Raw/Activity（若语义明确），不进入 Fresh。
- 未知模型价格：Token 正常入账，金额为 null，降低 cost coverage。
- Rollup 失败：Ledger 与 outbox 事务成功后可幂等重放，榜单显示最近成功更新时间和 lag；全量重建不一致时停止 V2 公开榜。
- 批次部分异常：协议、签名、canonical payload 或隐私字段错误整批拒绝；单条 observation 的语义、重复、冲突或风险问题按条返回公开状态码。
- 相同 sequence 不同 digest：拒绝批次、冻结该 credential 的后续窗口并要求 doctor/恢复检查，不能自动选择一批。
- 同级 observation 数值冲突：保留双方、canonical head 不采用较大值，进入 observation_conflict。
- 风险规则误报：保留原 observation/event，不删除；解除隔离后通过 head transition + outbox 重建 Rollup。
- Client schema 突变：通过 registry kill switch 暂停版本，避免静默错误累计。
- Registry 签名无效、版本倒退或远端不可达：继续使用 last-known-good；没有兼容 fallback 时只停止受影响 Adapter，不影响其他来源。
- Installation key 丢失：撤销旧 credential，走 identity recovery/new installation；不能通过重置 sequence 复活旧 key。
- 定价更新：新增 price version，不覆盖历史价格；支持显式重算但保留旧版本审计信息。

## 19. 测试与验收

### 19.1 指标测试

- OpenAI：input 包含 cached 的 Fresh/Raw golden vector。
- Anthropic：普通 input + cache creation + cache read 的互斥 vector。
- Gemini：prompt/cache/candidates/thoughts/tool-use prompt vector，并在支持版本校验 normalized total 与 `totalTokenCount`。
- Cache write 不重复、cache read 不进入 Fresh。
- 只有 total 时 Fresh 为 null。
- reasoning subset/separate 两类 Provider 语义。
- 未知价格不使用 fallback。
- OpenClaw regular input + cache read + cache write 的 input_total golden vector。
- Hermes 至少覆盖 Anthropic 与 OpenAI-compatible 两类 Provider 的 input/cache inclusion fixture。
- Property-based tests 随机生成 Token 分量，验证非负、cache 子集、reasoning relation、Fresh/Raw 单调性和溢出边界。
- `price_coverage_token_weighted` 与 request coverage 使用明确分母；未知 tier/region/cache TTL 不套错误价格。
- Eligibility matrix 对 evidence kind、time precision、modality、trust、integration status 和 risk status 的每种组合有表驱动测试。

### 19.2 去重测试

- 同一 event 出现在 JSON 和 JSONL，只计一次。
- 同一 Provider event 由两个不同 client namespace 观察，产生两个 observation、一个 canonical event、只计一次。
- 同一 source event 从两个 X/participant 提交，形成两个 observation、一个 canonical event 和 cross-participant ownership conflict；双方该 event 暂不计分，且不创建第二份 Token。
- Provider event canonical key 不受 client、installation、文件路径或 sourceRecordId 变化影响。
- 没有稳定 ID 的组合指纹只产生 possible duplicate/precedence 结果，不被测试误认为强去重。
- Session revision 只应用增量。
- 同一 revision 相同 digest 幂等；同一 revision 不同 Token 隔离；累计值减少不前移 head。
- Request、跨天 Session revision 和 aggregate snapshot 的时间归属符合 time_precision 规则。
- OpenClaw parent/subagent/tool-loop 不重复。
- Hermes compression parent/child lineage 有真实 fixture。
- Provider receipt 升级 trust，不新增 Token。
- 两个事务同时创建同一 canonical event，只能有一个获胜；另一个重读并附加 observation，不返回重复计分。

### 19.3 身份与反作弊测试

- 一个 participant 链接两个 X 后排名不拆分。
- 已绑定 installation 换新 X 登录触发 conflict，不静默迁移。
- 同一 public key 不能归属两个 participant。
- Enrollment nonce 过期、复用和错误 key proof 均拒绝。
- sequence 重放、跳退、并发窗口和 batch ID 重放符合幂等；同 sequence 不同 digest 拒绝。
- 正常 key rotation 由旧 key 证明；lost key recovery 撤销旧 credential，不能继承旧 sequence。
- 两个既有 participant merge 需要双方 OAuth proof；相同 canonical event 合并后仍只计一次，country history 不改写。
- 设备 churn、时间倒退、超模型上限和突增进入 provisional/quarantine。
- 风险规则先 shadow 后 enforce；测试记录命中分布、误报和申诉推翻。
- 解除风险后通过 head transition/outbox 更新，Rollup 可重建且不直接改分。

### 19.4 隐私测试

- Payload schema 对 prompt、content、path、email、tool input 等键使用 denylist + allowlist 双保险。
- Fixtures 中放置 canary secret、文件路径和邮箱，断言 preview/upload 中完全不存在。
- OpenClaw Adapter 不打开 transcript 正文路径。
- Hermes 查询只选择允许列，不访问 messages/FTS。
- Cowork 未经过本地过滤的 OTel 整批拒绝。
- Cowork 原始 session.id、标准 resource/scope、user.email 和 workspace.host_paths 不上传；本地 session digest + sequence 在不同 Session 不碰撞。
- 低熵 scope/event ID 即使经过 SHA-256 也被拒绝；高熵 digest 不出现在公开 API 和普通日志。
- Registry release 签名、版本回退、篡改和过期测试；失败时使用 last-known-good。
- Payload、Adapter fixture 和错误响应使用 fuzzing/canary，覆盖深层嵌套禁用字段、Unicode、超长数字和恶意 schema。

### 19.5 迁移与 E2E

- V1 Legacy 与 V2 Rollup 不混算。
- 同一用户同时运行 V1/V2 CLI 不重复进入 V2。
- 90 天回放和 cutoff 正确。
- CLI 升级原子替换调度任务；检测双调度器时 doctor 报告准确。
- Fresh/Raw/Cost/Client/Country 查询返回 scoring_version、Provider-reported label、eligibility、两种 price coverage、modality 和 time precision。
- 国家修改只影响新有效区间，不把历史 Token 搬到新国家；merge 后重新冷却但历史 membership 不变。
- 删除账号后的数据与 tombstone 生命周期符合规格。
- 对同一数据集，outbox 增量 Rollup 与 canonical heads 全量重建逐维一致；随机中断、重复消费和乱序重试仍一致。
- V2 关闭公开查询后 observations/event heads 仍完整，可修复后重建恢复；不回写 V1。
- Web 运行 lint、test、build；CLI 运行项目约定的完整检查链。

### 19.6 协议、负载与故障恢复

- Windows、macOS、Linux 对同一 RFC 8785 payload 产生相同 SHA-256 和 Ed25519 golden signature。
- Key storage capability 在 OS protected、user file、unavailable 三种路径下行为明确，权限和 doctor 输出有测试。
- Evidence API 对批次大小、条数、installation/credential 速率、并发 canonical resolution 和 outbox backlog 做压力测试。
- 数据库事务在 observation 写入、head 更新、outbox 写入任一点故障时保持原子性；不存在 observation 已计分但无 provenance，或 head 已变更但无 outbox。
- 全量 rebuild、备份恢复和价格/风险规则重放在生产规模样本上有时间与资源预算。

## 20. 上线监控指标

### 20.1 Primary Outcome KPIs

```text
supported_active_participant_coverage
  = 30d 内至少一个 exact Adapter 产生 accepted event 的参与者
    / 30d 内已连接且检测到任意受支持客户端的参与者

token_weighted_exact_coverage
  = exact request/session canonical events 的可解释 Raw Token
    / 所有被观察到且语义至少足以计算 Raw 的 Token

post_acceptance_correction_rate
  = 因 Adapter/normalization/duplicate 错误而在 30d 内撤销或修正的 accepted contribution
    / 同期 accepted contribution
```

前两个衡量“覆盖更多 Agent”是否转化为真实可排名覆盖；第三个防止用错误解析换取表面覆盖率。

### 20.2 Driver Metrics

```text
exact_evidence_coverage
fresh_metric_coverage
price_coverage_token_weighted
price_coverage_request
integration_status_conversion_rate
legacy_to_v2_conversion_rate
canonical_event_resolution_rate
global_duplicate_rate
cross_identity_collision_rate
adapter_schema_failure_rate
rollup_lag
```

### 20.3 Guardrails

```text
quarantine_rate
appeal_overturn_rate
post_acceptance_correction_rate
fresh_to_raw_ratio_shift
cache_disable_suspicion_rate
privacy_schema_rejection_rate
privacy_canary_leak_count
rollup_rebuild_mismatch_rate
registry_signature_failure_rate
participant_merge_rate
participant_merge_overturn_rate
country_conflict_rate
```

`privacy_canary_leak_count` 和 `rollup_rebuild_mismatch_rate` 的可接受值始终为 0。其余阈值不能在没有基线时伪装成精确目标：Phase 0/preview 至少收集一个完整 30d 窗口，按 client/version/trust 分层记录中位数、P95、误报和申诉推翻，再批准 exact/enforce 阈值。所有阈值有 owner、制定日期、证据窗口和复审日期。

任何 Adapter 的 duplicate rate、Fresh/Raw 比例、correction rate 或 schema failure 突升时，应能按 client + version + schema 一键停止公开计分而不停止本地扫描诊断。任何 Rollup mismatch 或隐私 canary 泄漏立即关闭受影响 V2 查询/Adapter，不等待普通阈值窗口。

## 21. 实施拆分

本规格覆盖多个独立子系统，后续不能写成一份巨型实现计划。本次专家修订确认后，按以下顺序分别生成计划：

1. Token normalization、modality/reasoning semantics、pricing coverage 与签名 client registry。
2. Participant/X identities、country membership、installation key storage、merge/recovery/key rotation。
3. Challenge enrollment、JCS/Ed25519 batch、sequence/idempotency 和跨平台协议 fixtures。
4. Usage observations、canonical event resolution、revision/conflict、canonical event heads、risk states 与 rollup outbox/rebuild。
5. Codex/Claude Code/OpenClaw/Hermes/CodeBuddy/Gemini 专用 Adapter 和 integration status gate。
6. Provider-reported Fresh/Raw/Cache/Cost/Client/Country/Legacy/Verified-pending 榜单与 eligibility matrix。
7. V1/V2 shadow、调度器切换、历史回放、GA gate 和回滚。
8. P1/P2 平台目录与原生 Credit/Task/Activity 指标。

每个计划都必须产生可独立上线、可回滚、可测试的系统增量，并列出 schema migration、feature flag/kill switch、可观测指标、回填/重建路径和对前序计划的协议依赖。

## 22. 参考资料

Token/cache 官方语义：

- [OpenAI API usage](https://platform.openai.com/docs/api-reference/usage/audio_transcriptions_object)
- [Anthropic pricing and token usage](https://docs.anthropic.com/en/docs/about-claude/pricing)
- [Gemini GenerateContent UsageMetadata](https://ai.google.dev/api/generate-content)

协议与签名：

- [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- [RFC 8032: EdDSA / Ed25519](https://www.rfc-editor.org/rfc/rfc8032)

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
