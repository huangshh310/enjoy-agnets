# spec/agent-runtime

> 主进程里的 ToolLoopAgent：流式、工具、审批、模式。最后更新：2026-08-31

## 当前真相

内核在 `packages/agent-core`（纯 TS）。Electron main 的 `agent-runner` 建模型、注入 workspace host、消费 `fullStream`，映射成 `StreamEvent` 再 `webContents.send("agent.event")`。

模式（`AgentMode`）：`agent` / `plan` / `ask` / `debug`。系统提示由 `systemPromptFor(mode)` 拼出。`plan` / `ask` 只读；`agent` / `debug` 可写，危险工具走审批。

可选第二运行时：`codingRuntime: "harness"` 走 `packages/agent-harness`。已接线：Claude Code、Codex（要 Vercel 端口沙箱）、Pi（默认本机 just-bash）、OpenCode。DeepSeek 仍是占位。这是插件位，不是默认内核。

### 内置工具

| 工具 | 审批 | 说明 |
|---|---|---|
| `read_file` | 否 | 限工作区相对路径 |
| `list_dir` | 否 | |
| `glob` | 否 | 最多 400 条 |
| `grep` | 否 | 最多 200 条 |
| `edit_file` | 是 | 工作区写 + diff |
| `write_file` | 是 | |
| `bash` | 是 | cwd 锁工作区；默认禁网；超时；输出截断 |
| `code_mode` | 是 | 写脚本再执行，走写盘 + bash 审批 |
| `delegate` | 写盘时是 | plan/ask 只读；agent/debug 可写，审批与主循环同一条 `decideApproval` |

工具输出超过约 80_000 字符截断。写 / bash / commit 集合见 `WRITE_TOOLS` / `BASH_TOOLS` / `COMMIT_TOOLS`。

审批策略来自用户偏好：`requireWriteApproval`、`requireBashApproval`、`requireCommitApproval`、`permissionMode`。UI 决定：`allow` / `deny` / `allow_session`。执行只在 main。`approval.required` 落库时用进程内密钥签 HMAC；`agent.decide` 再验库内行 + HMAC。`ApprovalDecision` `.strict()`，多传的 `args` 被拒而不是丢掉；签名校验的是落库 args，不是 renderer 再传一份。

ToolLoop `stopWhen` 走 SDK `stepCountIs` + `isLoopFinished`（当前恒 false）+ 可选 `hasToolCall`。步数来自偏好 `maxAgentSteps`（默认 20，上限 64）。`prepareStep` 每步裁历史。每步 `onStepFinish` 写 `run_steps`。总超时 `agentTimeoutMs`（0 不限）经 `withTimeout` / `armTimeout` 接到 Agent 泵和 `ai.generate`；步进超时 `stepTimeoutMs` 以 `{ stepMs }` 传给 ToolLoop。超时发 `run.error` + `generation.warning`（`code=timeout`），指标 `errorClass=timeout`。bash 用 `toolTimeoutMs`。`ai.resume` 对 cancelled/failed Agent run 用 checkpoint 快照重启同一 `runId`。

### 流事件（实现已有）

`run.start` → `text.delta` / `reasoning.delta` / `tool.*` / `approval.*` / `file.changed` / v2：`message.part.*` `structured.delta` `source.added` `asset.created` `usage.updated` `step.*` `workflow.*` `mcp.*` `realtime.*` `generation.warning` → `run.end` | `run.error`

`delegate` 独立上下文只回 `SubagentSummary`。plan/ask 只有读工具；agent/debug 用 `createCodingTools`（不含再 delegate），写盘 / bash 经 `createSubagentApproval` 挂到主 run 的 `approval.required`。没有等待器时拒绝，不偷偷执行。Workflow / Code Mode 审批仍在 main。UIMessage parts 与旧 `content` 并存。

会话消息存在 SQLite。助手侧复杂载荷用 `assistant-payload` 序列化（reasoning + tool + sources / assets / structured），不要把 tool JSON 当纯文本渲染。刷新会话时 `hydrate-thread` 优先读信封，缺失则从 `message_parts` 补回。

用户消息可带 `attachments`（资产 id）。main 把二进制编进最后一条用户 `file` part。跑循环前 `citeKnowledge` 检索知识库：UI 收 `source.added`，prompt 只塞片段。Composer 运行中点 Stop 走 `agent.abort`。

## 不变量

- 不在 React 组件里跑 agent 循环。
- 不把整仓源码塞进上下文；用 read / grep / glob 按需取。
- 工具被拒后模型不得用同一调用死磕（系统提示已写）。
- DeepSeek 带 tools 时必须回传上一轮 `reasoning`（见 `ChatMessage.reasoning`）。

## 代码入口

- 建 agent / 流：`packages/agent-core/src/agent.ts`
- 子 Agent 审批：`packages/agent-core/src/agents/subagent-approval.ts`、`subagent-loop.ts`
- 工具：`packages/agent-core/src/tools/index.ts`
- 审批：`packages/agent-core/src/tool-approval.ts`
- HMAC：`apps/desktop/src/main/services/approval-hmac.ts`、`packages/db/src/hmac.ts`
- 停止条件：`packages/agent-core/src/policies/stop.ts`
- 主进程编排：`apps/desktop/src/main/services/agent-runner.ts`（启动 / 中止 / 审批）
- 内存态：`agent-run-state.ts`；泵循环：`agent-pump.ts`；启动：`agent-run-start.ts`
- 知识引用：`apps/desktop/src/main/services/cite-knowledge.ts`
- 附件：`apps/desktop/src/main/services/attach-run-files.ts`
- SDK 能力表：[../references/vercel-ai-sdk-7-feature-matrix.md](../references/vercel-ai-sdk-7-feature-matrix.md)

## 已知坑

- 用户在 stream 还没结束时点 Allow：必须 `resumeAfterPump`。pending 未清空时不能提前 return 丢掉该标志；`finally` 里 `resumeAfterPump || continuePump` 都要再泵一轮。
- 总超时在进入审批等待时会清 timer，避免用户思考时被当成 timeout；恢复泵后重新计时。
- HMAC 密钥只在 main 进程内存；重启后未决审批作废，不要从 renderer 回传 hmac。
- 建工具时必须闭包注入 `AgentWorkspaceHost`。AI SDK 7 不会把 runtimeContext 传进 `execute` 的 `options.context`。
- 结构化输出在 v7 已并入 `generateText` / `streamText` 的 `output`，不要再用旧的 `generateObject` 主路径。
- 渲染线程：Thinking 用 Beautiful UI 风格 trace，不要把 `message.content` 当纯字符串倒出来。
- Harness：Claude / Codex / OpenCode 是桥接，just-bash 没有端口，不能拿来替 Vercel。Pi 才走 just-bash。OpenCode 1.0.95 的 provider-utils 品牌和 harness 1.0.94 不一致，工厂处 `as never`，不要当成运行时协议不同。
- `ai.resume` 对 Agent 是同一请求重启 ToolLoop，不是 SDK `session.detach` 中途续跑。
