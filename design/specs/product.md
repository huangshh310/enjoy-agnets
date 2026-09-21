# spec/product

> 本地优先的 Agent IDE：工作区、Agent 循环、审批、MCP。最后更新：2026-09-21

## 当前真相

Enjoy Agents 不是 VS Code 插件，也不是「聊天框套一层 Electron」。中心是 **Agent 循环**：读工作区、改文件、跑命令、在危险操作前停下来等人审批。

第一期必须同时满足：

- 本机工作区可见（文件树 + Git Changes + Files Monaco 预览可写）
- 流式推理与工具过程可见（Thinking / Tool / Diff）
- 写文件、执行 shell 默认可审批
- 用户自带 Key（BYOK），密钥不下发到渲染进程
- 可以完全没有云服务

当前桌面壳：`apps/desktop`，发版目标是 **Windows / macOS / Linux** 同一套产品，不是只给开发者本机一种系统用。Hash 路由，主界面是三卡片工作区（轨道+情境 / Stage / Inspector），模块在壳内换轨，不是独立产品页。C 端引擎选择（`AgentEngineRail` / `AgentPicker` 胶囊与导轨项）只画品牌、引擎名、模型、就绪灯；协议/登录微标（`ACP · 订阅登录` / `本地 ToolLoop` / `ACP Stdio` 等）只进设置分段、能力矩阵、配置边界与文档。

## 不变量

- Agent 主循环必须留在本机（Electron main），不要上云。
- 渲染进程只画界面，不调模型、不读明文 Key、不直接 `fs` / `child_process`。
- 第一期不做：云账号、实时多端 CRDT。向量检索与多 Agent 已按本地路径落地（Knowledge / Workflow / 子 Agent 摘要）；云 Gateway / OTEL / Vercel Sandbox 仍是可选适配器。
- 每次功能必须能在 Win / macOS / Linux 上诚实工作或明确降级；禁止把 Homebrew / Unix PATH / macOS 快捷键写进「已经全平台」。

## 分期（对照实现，不是口号）

| 阶段 | 状态 | 内容 |
|---|---|---|
| MVP | 已落地壳 | 无边框窗口 + 三栏、本机 SQLite 会话、OpenAI 兼容 / Anthropic + ToolLoopAgent、读/搜/写（审批）/ bash（审批）、流式 UI、C 端探索/执行（内部 ask/plan/agent） |
| V1 | 进行中 | MCP、Knowledge、Workflow 恢复、资产库、官方媒体工厂（Fal/ElevenLabs 等）、本地 Telemetry、能力探测、本机 CLI（Cursor / Claude / Codex / Antigravity ACP）；自动更新走 GitHub Releases（见 `updates` spec）；Git Review 已落地线性 log / 暂存 / 还原 / 推送 / 检查点，**不做** PR / CI / 提交拓扑图；P0-H 扩展发现壳、I1 会话换模、P0-R SSH 远程工作区、**I4 本机 Automations（手动 + cron + 保存后 + 本机 webhook）**已落地。**I3 / I5–I7 与云 webhook / 云 cron** 未落地（Registry 花名册、跨引擎检索、工作流小图、CI 失败再跑、多机舰队） |
| V1.5 | 后置 | 云账号、token 代理、外部 OTEL、Vercel Sandbox |

ACP 宿主里程碑（对照 `m1`–`m4` specs，不是口号）：

| 阶段 | 状态 | 内容 |
|---|---|---|
| M1 Usage | 已落地 | L1–L4 Usage、能力矩阵、配置边界 |
| M2 Attention | 已落地 | Strip / Dock / Inbox 三层；后台审批 ≤3s 可见；侧栏 `waiting_review` 灯 |
| M3 handoff | 进行中 | 换引擎摘要注入 system/hidden，禁止当第一条可见用户消息；设置「设为主引擎」走同一套确认坞。同引擎换模是 I1，不是本里程碑 |
| M4 Registry | M3 之后 | ACP Registry + 自定义 agent；**不做** PTY 兜底 |

整段程序明确不做：M5 git worktree、M6 摩擦/digest/团队 MCP。M5 会话状态灯与 ACP 进程收尸已落地。M6 skill-sources **可选更新** 已薄层落地（仅 Skills 顶栏 + Agent 默认项；无 Git 源不渲染按钮；空会话禁止同步条；不自动同步）。

## 明确不做

1. 用 Next.js / TanStack Start 包桌面
2. 在 renderer 调模型或跑 agent 循环
3. 第一期上 Mastra / LangGraph / TanStack AI
4. `better-sqlite3` 当默认驱动（用 `node:sqlite`）
5. 未审批就执行 write / bash
6. API Key 进渲染进程或进 Git

## 代码入口

- 产品说明：`README.md`
- 选型长文：[../references/tech-stack.md](../references/tech-stack.md)

## 已知坑

- 技术栈长文里的目录（`packages/terminal`、独立 Hono 进程）是规划，不是当前仓结构。以本 spec 与 `architecture` 为准。
- 对照高星 Agent 项目的缺口清单见 [../references/gap-audit-vs-github-agents.md](../references/gap-audit-vs-github-agents.md)。审计当时的假 Workflow / Automation / 通知 / Trace / MCP App / Monaco 多数已改；以文首与各 spec「当前真相」为准。仍不做 M5 worktree / M4 ACP PTY 登录兜底 / 云 MCP / `session/set_mode`。Agent Git 工具是 `git_status` / `git_diff` / `git_log` / `git_commit` / `git_branch` / `git_push`。`git_commit` 默认只提交已暂存，`stageAll: true` 才 `add -A`。
- 2026 星数榜与设计课（OpenCode / Codex / Cline / Aider / OpenHands / Goose）见 [../references/oss-agent-landscape-2026.md](../references/oss-agent-landscape-2026.md)。那是对照笔记，不是把 TUI / worktree / 云 Server 抄进来的许可证。
