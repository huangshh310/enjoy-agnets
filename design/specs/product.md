# spec/product

> 本地优先的 Agent IDE：工作区、Agent 循环、审批、MCP。最后更新：2026-09-08

## 当前真相

Enjoy Agents 不是 VS Code 插件，也不是「聊天框套一层 Electron」。中心是 **Agent 循环**：读工作区、改文件、跑命令、在危险操作前停下来等人审批。

第一期必须同时满足：

- 本机工作区可见（文件树 + Git Changes + 后续 Monaco）
- 流式推理与工具过程可见（Thinking / Tool / Diff）
- 写文件、执行 shell 默认可审批
- 用户自带 Key（BYOK），密钥不下发到渲染进程
- 可以完全没有云服务

当前桌面壳：`apps/desktop`。Hash 路由，主界面是三卡片工作区（轨道+情境 / Stage / Inspector），模块在壳内换轨，不是独立产品页。

## 不变量

- Agent 主循环必须留在本机（Electron main），不要上云。
- 渲染进程只画界面，不调模型、不读明文 Key、不直接 `fs` / `child_process`。
- 第一期不做：云账号、实时多端 CRDT。向量检索与多 Agent 已按本地路径落地（Knowledge / Workflow / 子 Agent 摘要）；云 Gateway / OTEL / Vercel Sandbox 仍是可选适配器。

## 分期（对照实现，不是口号）

| 阶段 | 状态 | 内容 |
|---|---|---|
| MVP | 进行中 | 无边框窗口 + 三栏、本机 SQLite 会话、OpenAI 兼容 / Anthropic + ToolLoopAgent、读/搜/写（审批）/ bash（审批）、流式 UI |
| V1 | 进行中 | MCP、Knowledge、Workflow 恢复、资产库、官方媒体工厂（Fal/ElevenLabs 等）、本地 Telemetry、能力探测、本机 CLI（Cursor / Claude / Codex / Antigravity ACP）；自动更新走 GitHub Releases（见 `updates` spec）；Git 面板加深仍未完 |
| V1.5 | 后置 | 云账号、token 代理、外部 OTEL、Vercel Sandbox |

ACP 宿主里程碑（对照 `m1`–`m4` specs，不是口号）：

| 阶段 | 状态 | 内容 |
|---|---|---|
| M1 Usage | 已落地 | L1–L4 Usage、能力矩阵、配置边界 |
| M2 Attention | 本 PR | Strip / Dock / Inbox 三层；后台审批 ≤3s 可见 |
| M3 handoff | 后续 | 换引擎摘要注入 system/hidden，禁止当第一条可见用户消息 |
| M4 Registry | M3 之后 | ACP Registry + 自定义 agent；**不做** PTY 兜底 |

整段程序明确不做：M5 git worktree、M6 摩擦/digest/团队 MCP。可选后置：M5 会话状态灯 + 进程收尸；M6 skill-sources 可选 pull。

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
