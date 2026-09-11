# spec/m1-usage-and-capabilities

> M0/M1 宿主可感知：三路命名、Usage L1–L4、能力矩阵与配置边界。最后更新：2026-09-11

## 当前真相

三条路径**永不**并进同一个 Composer 开关：

| 路径 | C 端导轨 / 胶囊 | 出现位置 |
|---|---|---|
| Enjoy 本地 (`enjoy-local`) | 分组「本地」；胶囊品牌 + `引擎 · 模型` + 就绪灯 | AgentEngineRail + 胶囊；下层才是供应商→模型 |
| 本机 CLI (`claude` `cursor` `grok` `codex` `antigravity` `deepseek` `omp` …) | 分组「本机助手 / CLI」；品牌 + 引擎名 + 就绪灯；未装/需登录可作就绪语义 | AgentEngineRail + 胶囊 |
| 进阶沙箱 (`sandbox-harness`) | 不上轨 | 设置分段 only；**禁止**上 AgentEngineRail |

C 端 Rail / 胶囊**禁止**常驻协议/路径微标：`ACP · 订阅登录`、`本地 ToolLoop`、`ACP Stdio` 及同类。协议/登录只进设置分段、能力矩阵、配置边界与文档。有额度才挂 `UsagePill`。

能力只信静态 `RUNTIME_CAPABILITIES` / `composerChromeFor`（`packages/ipc-contract/src/runtime-capabilities*.ts`）。未声明 = 不做。renderer 不 import `@enjoy-agents/agent-harness`。

### Usage L1–L4

| 层 | 含义 | 数据源 | UI |
|---|---|---|---|
| L1 | 账户已用 % + reset | `agentTools.inspect`，且 `capabilities.quota===true` | 胶囊旁 `UsagePill`（空会话一律 `quiet`，含 ≥85%；**有消息后**才走 M1 警报阶；100% 必须是 inspect 数字）；设置账号区 |
| L2 | 自营积分 | 无真实 API | 账单页诚实空态；不画假条、不挂演示套餐 |
| L3 | 本轮 token / 上下文 % | 与 Context 共用 `estimateContextWindowStats`（按当前 runtime 投影） | Composer 底 `SessionMeter` + Limits 卡；无用量则隐藏。ACP / 沙箱不计 Enjoy 规则、技能、Enjoy MCP。禁止 720 / 260 假地板 |
| L4 | 额度耗尽 / 402 | 结构化 402 / credit / spend | `QuotaExhaustedCard`（ThreadErrorBanner 变体）+ 账单 / **切引擎打开 Composer AgentPicker**（禁止跳设置） |

额度条支持 Cursor / Grok / Antigravity 以及通过官方 CLI 凭据探针接入的 Claude（5h 会话 / 7d 周度窗口，来自 macOS Keychain 或 ~/.claude/.credentials.json 调取 api.anthropic.com/api/oauth/usage）与 Codex（5h 会话 / 周度窗口 / 速率限制重置额度 credits，来自 ~/.codex/auth.json 调取 chatgpt.com/backend-api/wham/usage）。Enjoy 本地与未登录/无额度 API 助手：**不画空条**，诚实展示空态或「该 CLI 暂无公开额度 API」。禁止 `Math.max(%, 2)` 假填充、90/95/100 占位、遥测伪造假数据。

本机记录（不是 L1）：`observability.cliUsage` 返回导轨 12 个 CLI 的四态。**12 源都扫盘**：Claude jsonl、Codex jsonl、Grok `usage.json` session 合计、OMP sessions jsonl（`message.usage` camelCase）、Cursor `agent-transcripts` jsonl（无 usage → scanned-empty）、其余按各家家目录 jsonl。目录不在 → directory-missing；有文件无用量 → scanned-empty。不要把导轨 CLI 标成「本版本不扫描」。聚合成日 / 模型 / 项目名。UI 主区按 CLI 贡献；点选过滤。Grok ticks 写在 Grok 行，禁止按模型 id 猜单价。Codex 不用 `model_provider` 当模型名。混合有/无拆分时脉冲行不画拆分。无用量源默认收起。挂 `#/observability`「本机记录」。renderer 只拿数字。项目名只留 cwd 最后一段。

状态：`empty` 隐藏 · `loading` 骨架 · `no-quota` 诚实空态 · `has-quota` 官方数字 · `error` L4 卡。

### 设置 → 智能体 IA

1. 分段：本机 CLI | 订阅与额度 (subscriptions) | Registry | 进阶沙箱 | 默认项
2. 顶栏一行可关提示：切到本机助手时 Enjoy 密钥不会带过去 + 扫描 / 体检；隔离令牌已配置时多「进阶沙箱：隔离令牌已配置」，禁止「Token：Vercel」
3. **CLI 密表**（助手 | 动力源 | 操作）；每行都有动力源。助手次行只拼版本 · 短路径（缺段用 —），不是 `listLine` / doctor。助手行挂微型额度胶囊（`AgentToolMiniQuota`）。`homeSynced` 才在名旁画「已同步」；「官方仍保留」只进抽屉。未找到：主槽「一键安装 / 安装中… / 重试」，失败一行人话，无假进度条。可绑才在抽屉里选档案；仅官方只读登录态。配置抽屉 576px 同壳；「这个助手用」账号/模型分行。
4. **订阅与额度**：Hub 摘要 + 饼/面积。图廊用顶栏切换一次只开一张图（组合 / 对比 / 分位 / 增长 / 本周 / 排行 / 日格 / 雷达 / 径向 / 健康 / 摘要 / 流向），禁止十二张图叠成超长页。数据仍接真实用量。每张卡仍是 OpenUsage 行密度。
5. **能力说明**默认收起：`CapabilityMatrix`（行=runtime，含沙箱 + 自定义 ACP；列=spawn / login / quota / thinking / fast / executionModes；「支持」不是已登录；点行跳到对应卡或沙箱分段）+ `ConfigBoundaryTable`（Key→Enjoy vault · **CLI 引用的供应商→Enjoy vault** · login→各家 CLI · MCP→`#/mcp` · Skills→`#/skills`）。自定义行画用户 **label**，不画 raw id/slug。

已删除：`AgentToolsHubMetrics`（装载率条、常绿灯、「沙箱隔离·实时 Token 流」）。`AgentLimitsCard` 下半 `PlanLimitsSection` 已删，上半只作 L3 明细。

## 不变量

- L1 数字只来自 inspect；`quota=false` 不画条。
- 进阶沙箱不得出现在 `AgentEngineRail` / `composerAgentTabs`。
- HMAC 审批契约不变。
- 没有自营计费：账单页诚实空态，禁止演示套餐 / 可点升级。

## 代码入口

- 契约：`packages/ipc-contract/src/runtime-capabilities.ts`、`packages/ipc-contract/src/agent-tools.ts`
- 官方探针与解析：`apps/desktop/src/main/services/agent-tools-account/probes/`、`parse-official-usage.ts`、`quota-pacing.ts`
- Composer：`ai-chat/usage/`、`agent-picker/`、`composer/composer-footer.tsx`
- 设置：`settings/agent-tools/subscriptions-dashboard.tsx`、`agent-subscription-card.tsx`、`subscription-quota-meter.tsx`、`agent-subscription-donut.tsx`、`usage-trend-sparkline.tsx`、`rate-limit-resets-card.tsx`
- L3 明细：`ai-chat/agent-limits/`
- L4：`thread/thread-error-banner.tsx`、`usage/quota-exhausted-card.tsx`
- 本机记录：`main/services/cli-transcript-usage/`、`observability/components/cli-usage/`

## 已知坑

- Claude / Codex 现已接通 OpenUsage 机制的官方额度 probe（quota=true），但若用户未登录 CLI 或凭据过期，probe 应优雅回退至 quota=false / no-quota 状态，UI 保持诚实空态，不得回退伪造数据。
- 官方额度窗口（如 Claude 5 小时会话与 7 天周度、Codex 会话与周度）包含动态重置时间与 pacing 计算（当前消耗速率 vs 剩余时间匀速 burn rate），当重置时间到达时需以官方窗口重置为准；消耗速率高于匀速 1.3 倍标记 warning/danger，避免误判为封号。
- `barWidth` 在设置订阅页等于 **已用%**，禁止为「看得见」把 1% 撑到 4%。数字可切剩余/已用，条不跟着倒。空会话 `UsagePill` 必须 `quiet`（含 ≥85%），有消息才用 alert/mid/low。
- 订阅页铺满 `wide` 舞台：Hub + 双列卡。禁止 `max-w-md` 贴左。无窗口助手禁止占一张空卡。
- 订阅页要像 OpenUsage 一样先出缓存：main 磁盘+内存 5 分钟；renderer **禁止**默认 `refresh: true`；进「智能体」页 **禁止** `invalidateQueries(inspect)`。右上角刷新才 `refresh: true`。过期缓存先返回旧值再后台刷新。
- `officialOrEmpty`：Cursor Dashboard token 仍可读用量时，**不得**因 CLI `loggedIn === false` 丢掉官方窗口。订阅页卡片认 `windows.length` 或 `hasQuota`。
- Cursor 的 Grok Bot 走 `GetSandUsageStatus`，Extra Usage 走 `cursor.com/api/usage-summary` 的 onDemand；**不要**指望 `GetCurrentPeriodUsage` 里带这两项。无 onDemand 时 Extra Usage 仍显示 `No data` 行。
- 订阅页禁止四格 KPI、「燃烧速率态势」、搜索框、2 列卡片网格、假 plan（Ultra / SuperGrok Heavy）、假 sparkline 占位柱。额度条禁止 `bg-rose-500` / `bg-amber-500`，走 `accent` / `status-yellow-text` / `text-error-primary`。
- `composerChromeFor` 的 Fast / 思考 / 模式显隐仍读同一张 capability 表；C 端 Rail/胶囊不要再画 `pathKind` 协议/路径微标（含 `ACP Stdio`）。协议词只进设置矩阵。
- 能力矩阵自定义行必须画用户 label，不要用 `custom:<slug>` 当显示名。本机 CLI 禁止再把矩阵/边界铺在卡片前面；「支持登录」不是已登录。
- 设置里 OMP「打开登录」必须带 `provider` 并等 callback，禁止无参 `login`（会失败或打不开授权）。
- 词表禁止残留 `limitFiveHour` / `limitWeekly*` 等 5 小时·周度占位文案；计划条已删，键也必须删。
- L4「切换引擎」必须 `setAgentPickerOpen(true)` 打开 Composer 胶囊，禁止 `navigate` 到 `#/settings/agent`。
- L3 禁止再写 720 系统 / 260 技能假地板。Limits 卡必须吃检查器同一本账（含芯片与压缩后消息），不要自己再估一套。切到 CLI 后规则/技能桶必须是 0。
- UsagePill / QuotaExhaustedCard 只用审批铬语义 token（`text-error-primary` / `background-tertiary-error` / `border-error-default`），禁止 `bg-rose-500` / `bg-amber-500`。
- 本机 jsonl 用量不是 L1。禁止把它画进 Composer `UsagePill`，也禁止按模型 id 猜单价做成账单。Claude 按行累加 `message.usage`；Codex 每个文件只取最后一次 `token_count.total_token_usage`。Grok 只读 `usage.json` 的 `session` 合计。OMP 按行累加 camelCase `message.usage`，不要把 OMP `cost` 美元并进 Grok ticks。Cursor transcript 无 usage 字段时是 scanned-empty，不要读 `store.db`。过滤后 KPI 必须用该源自己的 token 字段。
