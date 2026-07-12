# TokenRank AI 使用者品牌定位与首页口号设计

## 背景

TokenRank 当前以“AI Coding Token 排行榜”为核心表达，首页主口号为 `AI coding has a scoreboard.`。这一定位准确描述了产品最初的数据来源，但也把用户身份限制在程序员和 AI Coding 场景中。

AI 已经进入研究、产品、设计、运营、营销和创业等日常工作，Agent 也正在成为新的工作界面。TokenRank 的品牌需要从“编程工具使用榜”升级为“真正把 AI 用进工作的人所参与的 Token 排行榜”。现阶段产品仍从可采集的 Agent 与 AI 工具 Token 数据切入，不宣称 Token 用量等同于能力、效率或产出质量。

## 定位决策

### 核心受众

TokenRank 面向所有主动把 AI 用进真实工作的人，而不再只面向会写代码的程序员。创业者、产品经理、设计师、研究者、运营人员和开发者都可以认领这一身份。

### 核心价值

TokenRank 汇总用户在支持的 Agent 与 AI 工具中的 Token 用量，并通过公开排行榜提供两种价值：

1. 身份认同：证明自己是正在实际使用 AI 工作的人。
2. 竞技反馈：看到自己的 Token 使用排名以及与其他使用者的相对位置。

### 产品边界

- 品牌不再使用 `AI Coding` 限定用户身份。
- `Token` 继续作为产品名称、数据机制和竞技体验的核心概念。
- 排名表达的是聚合 Token 使用强度，不代表个人能力、生产效率或工作质量。
- 当前能力仍以产品实际支持的数据源为准；品牌定位为后续扩展更多 Agent 与 AI 工具预留空间。
- 隐私表述必须具体说明只上传聚合用量，不上传 prompt、代码或对话，避免使用含义模糊的 `Private work` 或“私有工作”。

## 首页 Hero 文案

### 英文

眉题：

> AI TOKEN LEADERBOARD

主口号：

> BURN TOKENS.<br>
> ASCEND RANKS.

说明文案：

> Track the tokens you put to work across AI agents and see where you rank. Only aggregate usage is uploaded—never your prompts, code, or chats.

### 中文

眉题：

> AI TOKEN 排行榜

主口号：

> TOKEN 燃烧。<br>
> RANKING 狂飙。

说明文案：

> 汇总你在各类 Agent 与 AI 工具中的 Token 用量，与真正把 AI 用起来的人同榜竞技。只上传聚合用量，不上传 prompt、代码或对话。

### 行动按钮

本轮保留现有行动结构，避免口号调整扩大为交互改版：

- 英文主按钮：`Join the board`
- 英文次按钮：`Read rules`
- 中文主按钮：`开始上榜`
- 中文次按钮：`查看规则`

## 文案设计理由

### 英文口号

`BURN TOKENS. ASCEND RANKS.` 采用两个命令句，每句两个单词、三个音节。`BURN` 提供直接、挑衅和竞技化的动作感，`ASCEND` 明确指向排名上升。主视觉应使用句号和换行，而不是逗号，以强化两段节奏和工业竞技风格。

### 中文口号

`TOKEN 燃烧。RANKING 狂飙。` 不做逐字翻译，而是延续 TokenRank 的中英文混排品牌语言。两句均由一个英文数据名词和一个双字中文动作组成，读音均为四个音节；`烧` 与 `飙` 押韵，兼顾结构对称、传播记忆和视觉冲击力。

### 说明文案

标题负责建立身份感和竞争欲，说明文案负责补足产品机制与隐私边界。文案避免使用“最会用 AI”“最高效”等无法由 Token 用量证明的判断，同时明确排行榜只接收聚合用量。

## 后续实施范围

用户确认本设计文档后，实施计划应覆盖所有仍带有旧 `AI Coding` 定位的用户可见品牌文案，包括但不限于：

- 首页中英文 Hero、眉题、SEO 标题与描述。
- 全站品牌长副标与短副标。
- Logo 下方品牌副标。
- Open Graph 图片及其替代文本。
- `layout` metadata、`site` 描述、`llms.txt`。
- README 中的产品定位说明。
- 与上述文案绑定的自动化测试断言。

实施时应逐项判断上下文：描述具体采集源、规则或历史能力时可以保留必要的工具名称；描述 TokenRank 的品牌和用户身份时不再以 `Coding` 作为总括限定。

## 验收标准

- 首页英文主口号准确显示为两行 `BURN TOKENS.` 和 `ASCEND RANKS.`。
- 首页中文主口号准确显示为两行 `TOKEN 燃烧。` 和 `RANKING 狂飙。`。
- 中英文说明文案使用本设计确定的最终版本。
- 品牌级用户可见文案不再把 TokenRank 总括为只面向 AI Coding 或程序员的产品。
- 具体隐私说明明确区分聚合用量与 prompt、代码、对话内容。
- 不新增 Token 用量代表能力、效率或产出质量的暗示。
- 文案相关测试、lint 和生产构建全部通过。
