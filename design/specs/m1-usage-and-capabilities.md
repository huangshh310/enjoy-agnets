# spec/m1-usage-and-capabilities

> M0/M1 宿主可感知：三路命名、Usage L1–L4、能力矩阵与配置边界。最后更新：2026-09-10

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

额度条只给 Cursor / Grok / Antigravity。Claude / Codex / Enjoy 本地：**不画空条**，诚实文案「该 CLI 无公开额度 API」。禁止 `Math.max(%, 2)` 假填充、90/95/100 占位、遥测伪造「5 小时 / 周度」计划条。

状态：`empty` 隐藏 · `loading` 骨架 · `no-quota` 诚实空态 · `has-quota` 官方数字 · `error` L4 卡。

### 设置 → 智能体 IA

1. 分段：本机 CLI | Registry | 进阶沙箱 | 默认项
2. 顶栏一行可关提示：切到本机助手时 Enjoy 密钥不会带过去 + 扫描 / 体检
3. **CLI 密表**（助手 | 动力源 | 操作）；每行都有动力源。助手次行只拼版本 · 短路径（缺段用 —），不是 `listLine` / doctor。`homeSynced` 才在名旁画「已同步」；「官方仍保留」只进抽屉。可绑才在抽屉里选档案；仅官方只读登录态。列表不画额度条或「额度进配置」。绑了档案后官方 inspect 只作旁注，额度条仍只在走官方登录时画、且不上列表。配置抽屉 380px 同壳。供应商 Configured 芯片跳 `#/settings/agent?tool=<id>` 闪对应行。视觉锁只认 [`previews/local-cli-dense-p0.html`](../previews/local-cli-dense-p0.html)（main `add29a4`）；`dense-v2` 是过程稿，勿接线。
4. **能力说明**默认收起：`CapabilityMatrix`（行=runtime，含沙箱 + 自定义 ACP；列=spawn / login / quota / thinking / fast / executionModes；「支持」不是已登录；点行跳到对应卡或沙箱分段）+ `ConfigBoundaryTable`（Key→Enjoy vault · **CLI 引用的供应商→Enjoy vault** · login→各家 CLI · MCP→`#/mcp` · Skills→`#/skills`）。自定义行画用户 **label**，不画 raw id/slug。

已删除：`AgentToolsHubMetrics`（装载率条、常绿灯、「沙箱隔离·实时 Token 流」）。`AgentLimitsCard` 下半 `PlanLimitsSection` 已删，上半只作 L3 明细。

## 不变量

- L1 数字只来自 inspect；`quota=false` 不画条。
- 进阶沙箱不得出现在 `AgentEngineRail` / `composerAgentTabs`。
- HMAC 审批契约不变。
- 没有自营计费：账单页诚实空态，禁止演示套餐 / 可点升级。

## 代码入口

- 契约：`packages/ipc-contract/src/runtime-capabilities.ts`
- Composer：`ai-chat/usage/`、`agent-picker/`、`composer/composer-footer.tsx`
- 设置：`settings/agent-tools/capability-matrix.tsx`、`config-boundary-table.tsx`
- L3 明细：`ai-chat/agent-limits/`
- L4：`thread/thread-error-banner.tsx`、`usage/quota-exhausted-card.tsx`

## 已知坑

- Claude / Codex `inspect` 仍拉账号，但 `quota=false`，UI 不得回落空条 + `—`。
- `barWidth` 必须等于官方百分比，禁止为「看得见」把 1% 撑到 4%。空会话 `UsagePill` 必须 `quiet`（含 ≥85%），有消息才用 alert/mid/low。
- `composerChromeFor` 的 Fast / 思考 / 模式显隐仍读同一张 capability 表；C 端 Rail/胶囊不要再画 `pathKind` 协议/路径微标（含 `ACP Stdio`）。协议词只进设置矩阵。
- 能力矩阵自定义行必须画用户 label，不要用 `custom:<slug>` 当显示名。本机 CLI 禁止再把矩阵/边界铺在卡片前面；「支持登录」不是已登录。
- 设置里 OMP「打开登录」必须带 `provider` 并等 callback，禁止无参 `login`（会失败或打不开授权）。
- 词表禁止残留 `limitFiveHour` / `limitWeekly*` 等 5 小时·周度占位文案；计划条已删，键也必须删。
- L4「切换引擎」必须 `setAgentPickerOpen(true)` 打开 Composer 胶囊，禁止 `navigate` 到 `#/settings/agent`。
- L3 禁止再写 720 系统 / 260 技能假地板。Limits 卡必须吃检查器同一本账（含芯片与压缩后消息），不要自己再估一套。切到 CLI 后规则/技能桶必须是 0。
- UsagePill / QuotaExhaustedCard 只用审批铬语义 token（`text-error-primary` / `background-tertiary-error` / `border-error-default`），禁止 `bg-rose-500` / `bg-amber-500`。
