# Enjoy Agents：ACP 多引擎宿主开发实现计划

> 位置：`design/references/Enjoy Agents：ACP 多引擎宿主开发实现计划.md`  
> 角色：Reference（背景与分期计划）。**实现以 `design/specs/` 为准**；冲突时先改 spec 再改本文。  
> 调研截止：约 2026-09-08。  
> 关联：[`../specs/agent-cli.md`](../specs/agent-cli.md) · [`../specs/ui.md`](../specs/ui.md) · [`../specs/product.md`](../specs/product.md) · [`../specs/architecture.md`](../specs/architecture.md) · [`./tech-stack.md`](./tech-stack.md) · [`Enjoy Agents：Vercel AI SDK 7 全能力落地计划.md`](./Enjoy%20Agents：Vercel%20AI%20SDK%207%20全能力落地计划.md)

---

## 0. 一句话定位

Enjoy Agents 是 **本地优先的 Electron ACP Client / 多引擎宿主**（与 Orca、Codeg、AiderDesk、OpenHands Canvas、Zed Agent Panel 同赛道），不是再做一个 Cline / OpenCode 式单 Agent。  
差异化押在：本机已接好的多 CLI + ToolLoop 本地循环 + 一流审批/Diff/Usage chrome + 并行会话身份清晰；MCP 写清「host 透传 vs agent 自带」。

**参考（不是对标）**

| 参考 | 借什么 | 不借什么 |
|------|--------|----------|
| [monocode](https://github.com/hardbeat920/monocode) | CLI 切换交互：探测可用性、按引擎选模型、中途换引擎 handoff | 产品对标、星数竞赛；其「harness」= CLI adapter，与本仓 `packages/agent-harness` 不是同一概念 |
| [TeamAI](https://github.com/Tencent/teamai-cli) | 团队 skills/rules/MCP 分发、能力矩阵、摩擦信号、digest/dashboard | 把 Enjoy 做成第二个 `teamai` CLI；TeamAI 不跑对话 |
| 高星产品（OpenCode / Cline / Zed / Orca / Claude Code / Codex…） | 交互合同：Plan/Act、工具卡、审批、Usage、空态 | 再造 VS Code fork（Void 已弃用是反例） |

**协议主航道（官网）**

| 协议 | 官网 | Enjoy 姿态 |
|------|------|------------|
| **ACP** | https://agentclientprotocol.com | **主**：编辑器/IDE Client ↔ 编码 Agent |
| **MCP** | https://modelcontextprotocol.io | **主**：Agent ↔ 工具/数据；可随 ACP 转发给 Agent |
| **A2A** | https://a2a-protocol.org | **后置**：Agent ↔ Agent，非 IDE P0 |
| **AG-UI** | https://docs.ag-ui.com | **可选**：Web 事件流副线 |

---

## 1. 三路运行时（必须在产品文案里分清）

| 路径 | `runtimeId` / 传输 | 实现落点 | 密钥 / 登录 | Composer 露出 |
|------|-------------------|----------|-------------|---------------|
| **Enjoy 本地（ToolLoop）** | `enjoy-local` / local | `packages/agent-core` + AI SDK 7 ToolLoopAgent | Providers vault（BYOK） | Fast / 思考档 / 执行模式 / 斜杠 / 语音（能力允许时） |
| **ACP Host** | `claude` `cursor` `grok` `codex` `antigravity` / `acp-host` | `packages/agent-harness/src/acp/` + `agent-tools/` | 各家本机 `login`；禁止假额度条 | 只留 `+`、审批、引擎胶囊、发送；`composerChromeFor` |
| **进阶沙箱 Harness** | 设置「进阶沙箱」；旧 harness / sdk-sandbox | `packages/agent-harness/src/adapters/`（claude-code / codex / opencode / pi） | Providers + 沙箱 token | **不要**和 ACP 引擎导轨挤成一排 |

不变量（摘自 `agent-cli` / `architecture`）：

- UI **只信**静态 `RuntimeCapabilities`（`packages/ipc-contract/src/runtime-capabilities*.ts`），不信 ACP `initialize.agentCapabilities`。
- `agentTools.inspect` 只返回公开账号与官方额度；token 永不进 renderer。
- 额度条仅 `quota=true`（Cursor Dashboard、Grok billing、Antigravity `quota_groups`）；Claude / Codex **不画空条**。
- 空配置默认 Enjoy Local；外部 CLI 不是默认内核。
- comingSoon → available 硬条件见 `agent-cli` spec（OpenCode → Gemini → Pi 候选顺序）。

---

## 2. 现状基线（2026-09 已接线，勿重复造）

已具备（以 specs 为准）：

- 三卡片 AppShell（Nav / Stage / Inspector）、BoardUI token、皮肤 classic/glass/ink/sketch
- AgentStepTree、审批三表面（command / plan / questions）、Todo Dock、session-review、附件托盘
- Composer AgentEngineRail + AgentPicker；ACP 底栏按 capability 显隐
- 本机 CLI 探测 / 安装提示 / login / doctor / inspect
- Skills / MCP / Knowledge / Observability 工作模块；skill-sources 本机同步雏形
- AI SDK 7 全能力落地另见同目录 SDK 计划文

已知缺口（本计划主攻）：

1. Usage 可见性偏设置卡，缺 Composer / statusline 级 L1–L4 分层
2. 跨会话 Attention（审批 / 提问 / 错误）未上浮
3. 中途换 ACP 引擎缺 handoff 手势（参考 monocode `planComposerSwitch`）
4. ACP Registry / 自定义 `command+args` 未产品化
5. 配置边界表（auth 归谁）未在 UI 明示
6. comingSoon CLI（OpenCode / Gemini / Pi）未升 available
7. 团队层（TeamAI 式 pull / 摩擦分享 / digest）未做；Skills 可演进对接
8. Git Review / Monaco 仍加深中（不挡宿主里程碑，但 Review pane 要跟审批 diff 对齐）

---

## 3. 里程碑总览

```text
M0  文档与契约对齐（本文 + 必要的 spec 补丁）
M1  宿主可感知：Usage 分层 + 能力矩阵 + 配置边界
M2  审批与 Attention：队列上浮 + 内嵌 diff 保真
M3  引擎切换体验：handoff + 空态检测清单 + 能力微文案
M4  ACP 扩展：Registry / 自定义 agent + OpenCode→Gemini→Pi
M5  并行与隔离：session 身份 / 可选 worktree（学 Orca，可裁）
M6  团队层可选：skill 源同步增强 + 摩擦提示 + 本地 digest（学 TeamAI，可裁）
```

原则：每里程碑必须可演示；默认关实验能力并打 experimental；不引入 A2A/AG-UI 除非单独立项。

---

## 4. M0 — 契约对齐（0.5–1 天）

**目标**：开发与 Agent 读同一套词。

| 任务 | 产出 | Owner 建议 |
|------|------|------------|
| 确认三路命名进产品词表 | Enjoy 本地 / ACP 本机 CLI / 进阶沙箱 | 产品 + 前端 |
| `agent-cli` / `ui` 若文案冲突，先改 spec | PR 只动 specs + 本文 | 任意 |
| 从 `RUNTIME_CAPABILITIES` 导出「能力矩阵」草稿表 | 表进设置页或 docs | 前端 |

完成标准：新人读完本文 + `agent-cli` 不会把沙箱 Harness 和 ACP 当成同一切换列表。

---

## 5. M1 — Usage 与诚实能力（P0，约 3–5 天）

### 5.1 Usage 分层（L1–L4）

| 层 | 含义 | 数据源 | UI 落点 |
|----|------|--------|---------|
| L1 | 账户配额 % + reset | `agentTools.inspect`（仅 quota=true） | 引擎胶囊旁微条 / Agent Limits |
| L2 | 自营积分（若未来有） | 自有 API | 设置 Billing（现为演示稿则标「本地演示」） |
| L3 | Session tokens / $ / context% | 本轮 StreamEvent / agent-limits | Composer 底或轮次脚注 |
| L4 | CreditLimit / SpendLimit | 402/429 结构化错误 | `ThreadErrorBanner` 专用卡 + Billing 深链 |

规则：

- BYOK / Claude / Codex：**不要假装 remaining quota**；诚实空态文案「该 CLI 无公开额度 API」。
- 禁止 scrape provider HTML dashboard；禁止 90/95/100 占位。
- Cursor 只用 Dashboard `includedSpend/limit`；Grok 只用官方 billing；Antigravity 只用 `quota_groups.remaining_fraction`。

代码锚点：

- `apps/desktop/.../ai-chat/agent-limits/`
- `settings/agent-tools/` + `agentTools.inspect`
- `packages/ipc-contract` inspect 结果类型

### 5.2 能力矩阵 UI

设置 → 智能体：表格或芯片行展示 `spawn / login / quota / thinking / fast / executionModes`（读静态表）。  
参考 TeamAI README 的 Agent×能力矩阵，但是 **RuntimeCapabilities**，不是 skills 同步矩阵。

### 5.3 配置边界表（学 Zed）

设置页明示：

| 项 | 归属 |
|----|------|
| API Key | Enjoy vault（仅 Enjoy 本地 / 绑定供应商） |
| CLI 登录 | 各家 `login`，Enjoy 不代管 OAuth 文件 |
| MCP | 本机 `#/mcp` 配置；是否转发随 runtime |
| Skills | `#/skills` + skill-sources；ACP 会话还吃各家 `~/.xxx/skills` |

完成标准：切到 Cursor 后用户不再问「为什么 Enjoy Key 没用」。

---

## 6. M2 — 审批与 Attention（P0，约 3–5 天）

参考：Acepe Attention Queue、Cline diff-before-approve、Zed Allow once / Always pattern、Crush 权限对话框。

| 任务 | 说明 |
|------|------|
| Attention 条 / Inbox 合流 | 跨会话上浮：`pendingApproval`、提问、错误、完成；点击跳回会话 |
| Permission 不埋进 transcript 底部 | 稳定 header / 固定条（已有审批卡则强化置顶与 HMAC） |
| plan 表面默认展开真实 diff | 写盘工具；禁止 30s 自动放行 |
| Allow once / Reject once / allow_session | 已有契约；UI 禁止用译文做相等判断 |
| AutoApproveBar 常驻策略一瞥 | 对标 Cline；YOLO 高警示 |

代码锚点：`thread/approval/`、`inbox/`、`approval-policy-*`。

完成标准：后台会话要审批时，前台 3 秒内可见入口。

---

## 7. M3 — 引擎切换与空态（P0/P1，约 3–4 天）

参考 monocode：`availability` 探测、`ModelPicker` Tab、`planComposerSwitch` / handoff 卡。

| 任务 | 说明 |
|------|------|
| 空会话切引擎 | 直接换 `runtimeId` + `bindSessionRuntime` |
| 已有用户轮切引擎 | 弹出 handoff 芯片（from→to + 摘要）；确认后 forget 旧 ACP session，注入摘要开新桥 |
| 未装态 | 灰态 + 安装/复制命令（已有 agent-cli-install）；就绪灯只信 `status === ready` |
| 胶囊微文案 | `本地 ToolLoop` / `ACP · 订阅登录` /（沙箱仅设置内） |
| 空态 checklist | 检测到哪些 CLI、缺什么、示例任务（禁营销 Hero） |

代码锚点：`agent-picker/`、`empty-state/`、ACP `disposeAcpSession`。

完成标准：从 Claude 切到 Cursor 有历史时不会静默丢上下文或假续跑。

---

## 8. M4 — ACP 扩展与 Registry（P1，约 5–8 天）

参考：Zed ACP Registry、ACP UI `agents.json`、官方 Agents/Clients 列表、Codeg 托管 adapter。

| 任务 | 说明 |
|------|------|
| 内置 Registry 视图 | 官方/目录内 agent：一键安装或复制命令 |
| 自定义 ACP agent | `command` / `args` / `env` / cwd 策略；经 `assertAllowedCommand` |
| 升 comingSoon | 按 spec 硬条件：OpenCode → Gemini → Pi；实测 initialize + session/new |
| ACP 事件保真增强 | `available_commands_update`、diff content、提问映射（spec 已标另开） |
| 可选 PTY 兜底 | 仅怪异 TUI；主路径仍 ACP（学 Zed Terminal Threads / CrewCode，慎做主路径） |

不做（本阶段）：`session/set_mode` 全量、跨 Agent MCP `delegate_to_agent`、寄生 Codex Desktop / SSH。

完成标准：用户可添加一个自定义 stdio ACP agent 并完成一轮带审批的对话。

---

## 9. M5 — 并行会话与隔离（P2，约 5–10 天，可裁）

参考：Orca worktree、Codeg 多 agent、Kilo Agent Manager。

| 任务 | 说明 |
|------|------|
| Session 身份 | 侧栏品牌标已按 session runtime；补 busy / waiting_approval 灯 |
| 可选 git worktree | 每会话隔离分支；默认关 |
| 并行上限与资源 | 同机多 ACP 进程；退出收尸（学 monocode 杀孤儿进程） |

完成标准：两个会话不同 runtime 并行跑，审批互不抢焦点（靠 Attention）。

---

## 10. M6 — 团队层可选（P2，学 TeamAI，可裁）

TeamAI 是 **分发层**，Enjoy 是 **宿主**。集成姿态：共存，不替代。

| 任务 | 说明 |
|------|------|
| 会话前同步 skill 源 | 打开工作区 / 新会话可选 pull；对接现有 `skill-sources` |
| 摩擦信号提示 | 打断/拒绝/重试达阈值 → Inbox 或 toast「值得记一条」；默认关 |
| 本地 digest | 本机 token / 干预率周报（Observability）；禁止假云看板 |
| MCP 团队声明 | 后置；先写清 host MCP vs 各家注入 MCP |

完成标准：不装 TeamAI 也能用 Enjoy；装了也不冲突目录约定。

---

## 11. UI / 交互合同（跨里程碑清单）

从高星产品抽象、且与 `DESIGN.md` / `ui.md` 一致：

1. Composer 能力条：Mode（Enjoy 本地）· Model · MCP 计数 · Context chips · Token
2. 工具卡 > 气泡；bash/edit/read 语义着色；同质工具 monocode 式聚合
3. Thinking 可折叠时间线；禁止假 Thinking
4. Review pane 与 Chat 解耦；Keep / Undo / Review 药丸密度对标 Cursor
5. 对外截图主推 `glass` 暗色 + Signal Blue；ink/sketch 不当营销主视觉
6. 八大 Anti-Patterns 全遵守（尤其 Fake-Status-Chrome、Centered-Marketing-Hero）

---

## 12. 工程与质量门禁

| 门禁 | 要求 |
|------|------|
| 契约 | 新 IPC 必进 `packages/ipc-contract` Zod；renderer 禁止 import agent-harness |
| 安全 | spawn `shell:false`；`assertAllowedCommand`；审批执行只在 main |
| 测试 | ACP map-events / capabilities / composerChromeFor 单测；关键路径 Playwright 可 skip 无 launcher |
| 文档 | 行为变更先改对应 `design/specs/*`，再改代码，再回写本文「现状基线」 |
| 与 SDK 计划关系 | ToolLoop / Workflow / Media / RAG 仍以《Vercel AI SDK 7 全能力落地计划》为准；本文只管 **宿主与多引擎** |

---

## 13. 明确不做

1. Dashboard HTML scrape 或伪造配额进度条  
2. 把进阶沙箱与 ACP 合成同一切换列表  
3. 以 A2A 为主路径做 IDE 协作  
4. Fork VS Code / 重做 Void  
5. 第一期云账号、多端 CRDT（见 `product` spec）  
6. 未审批执行 write / bash  
7. 为对称给 Cursor 加 `--fast` 等假旗标  

---

## 14. 建议优先级（产品拍板用）

| 优先级 | 项 | 里程碑 |
|--------|----|--------|
| P0 | Usage L1–L4 + 诚实空态 | M1 |
| P0 | Attention + 审批 diff | M2 |
| P0 | 换引擎 handoff + 空态检测 | M3 |
| P1 | Registry + OpenCode 升 available | M4 |
| P1 | 能力矩阵 + 配置边界表 | M1 |
| P2 | worktree 并行 | M5 |
| P2 | TeamAI 式 skill 同步 / digest | M6 |

---

## 15. 附录 A — 高星量级备忘（约 2026-09-08）

OpenCode ~206k · Open WebUI ~151k · Claude Code ~144k · Codex ~122k · Gemini CLI ~107k · Zed ~90k · OpenHands ~87k · Cline ~68k · Orca ~64k · Goose ~54k · Aider ~49k · LibreChat ~43k · Continue ~36k · Crush ~28k。  
宿主近邻（星少但模式近）：Codeg · Acepe · CrewCode · ACP UI · AiderDesk · Lightcode。

## 附录 B — 关键路径速查

| 主题 | 路径 |
|------|------|
| 能力表 | `packages/ipc-contract/src/runtime-capabilities.ts` |
| ACP | `packages/agent-harness/src/acp/` |
| CLI 工具箱 | `packages/agent-harness/src/agent-tools/` |
| 沙箱适配器 | `packages/agent-harness/src/adapters/` |
| Composer | `apps/desktop/.../ai-chat/agent-picker/` |
| 审批 | `apps/desktop/.../ai-chat/thread/approval/` |
| Usage UI | `apps/desktop/.../ai-chat/agent-limits/` |
| Skills | `apps/desktop/.../skills/` + `main/services/skill-sources/` |

---

*本文是实现计划，不是 spec。落地时以 `design/specs/agent-cli.md` 与 `design/specs/ui.md` 的「当前真相」为准。*
