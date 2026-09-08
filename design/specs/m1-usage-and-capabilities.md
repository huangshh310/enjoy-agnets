# spec/m1-usage-and-capabilities

> M0/M1 宿主可感知：三路命名、Usage L1–L4、能力矩阵与配置边界。最后更新：2026-09-08

## 当前真相

三条路径**永不**并进同一个 Composer 开关：

| 路径 | 导轨微标 | 出现位置 |
|---|---|---|
| Enjoy 本地 (`enjoy-local`) | `本地 ToolLoop` | AgentEngineRail + 胶囊 |
| ACP 本机 CLI (`claude` `cursor` `grok` `codex` `antigravity` …) | `ACP · 订阅登录` | AgentEngineRail + 胶囊 |
| 进阶沙箱 (`sandbox-harness`) | `实验 · 沙箱 Harness` | 设置分段 only；**禁止**上 AgentEngineRail |

能力只信静态 `RUNTIME_CAPABILITIES` / `composerChromeFor`（`packages/ipc-contract/src/runtime-capabilities*.ts`）。未声明 = 不做。renderer 不 import `@enjoy-agents/agent-harness`。

### Usage L1–L4

| 层 | 含义 | 数据源 | UI |
|---|---|---|---|
| L1 | 账户已用 % + reset | `agentTools.inspect`，且 `capabilities.quota===true` | 胶囊旁 `UsagePill`（空会话降强调，≥85% 才警报；100% 必须是 inspect 数字）；设置账号区 |
| L2 | 自营积分 | 无真实 API | Billing 保持「本地演示」；不画假条 |
| L3 | 本轮 token / 上下文 % | 会话折算（agent-limits / inspector） | Composer 底 `SessionMeter`；无用量则隐藏 |
| L4 | 额度耗尽 / 402 | 结构化 402 / credit / spend | `QuotaExhaustedCard`（ThreadErrorBanner 变体）+ 账单 / **切引擎打开 Composer AgentPicker**（禁止跳设置） |

额度条只给 Cursor / Grok / Antigravity。Claude / Codex / Enjoy 本地：**不画空条**，诚实文案「该 CLI 无公开额度 API」。禁止 `Math.max(%, 2)` 假填充、90/95/100 占位、遥测伪造「5 小时 / 周度」计划条。

状态：`empty` 隐藏 · `loading` 骨架 · `no-quota` 诚实空态 · `has-quota` 官方数字 · `error` L4 卡。

### 设置 → 智能体 IA

1. 分段：本机 CLI | 进阶沙箱 | 默认项
2. 顶栏提示：切到 Cursor 后「Enjoy 密钥不会传给它」
3. `CapabilityMatrix`：行=runtime（含沙箱一行），列=spawn / login / quota / thinking / fast / executionModes
4. `ConfigBoundaryTable`：Key→Enjoy vault · login→各家 CLI · MCP→`#/mcp` · Skills→`#/skills`
5. CLI 卡 + 配置弹窗；账号额度跟 L1 同一套 inspect

已删除：`AgentToolsHubMetrics`（装载率条、常绿灯、「沙箱隔离·实时 Token 流」）。`AgentLimitsCard` 下半 `PlanLimitsSection` 已删，上半只作 L3 明细。

## 不变量

- L1 数字只来自 inspect；`quota=false` 不画条。
- 进阶沙箱不得出现在 `AgentEngineRail` / `composerAgentTabs`。
- HMAC 审批契约不变。
- Billing 未接后端时必须标明「本地演示」。

## 代码入口

- 契约：`packages/ipc-contract/src/runtime-capabilities.ts`
- Composer：`ai-chat/usage/`、`agent-picker/`、`composer/composer-footer.tsx`
- 设置：`settings/agent-tools/capability-matrix.tsx`、`config-boundary-table.tsx`
- L3 明细：`ai-chat/agent-limits/`
- L4：`thread/thread-error-banner.tsx`、`usage/quota-exhausted-card.tsx`

## 已知坑

- Claude / Codex `inspect` 仍拉账号，但 `quota=false`，UI 不得回落空条 + `—`。
- `barWidth` 必须等于官方百分比，禁止为「看得见」把 1% 撑到 4%。空会话 `UsagePill` 走 `quiet`，不要把低用量画成强调色。
- `composerChromeFor` 的 Fast / 思考 / 模式显隐与本 spec 的 path 微标是同一张表，不要再写第二套 capability 形状。
- 词表禁止残留 `limitFiveHour` / `limitWeekly*` 等 5 小时·周度占位文案；计划条已删，键也必须删。
- L4「切换引擎」必须 `setAgentPickerOpen(true)` 打开 Composer 胶囊，禁止 `navigate` 到 `#/settings/agent`。
- UsagePill / QuotaExhaustedCard 只用审批铬语义 token（`text-error-primary` / `background-tertiary-error` / `border-error-default`），禁止 `bg-rose-500` / `bg-amber-500`。
