# spec/agent-runtime

> 主进程里的 ToolLoopAgent：流式、工具、审批、模式。最后更新：2026-09-03

## 当前真相

内核在 `packages/agent-core`（纯 TS）。Electron main 的 `agent-runner` 建模型、注入 workspace host、消费 `fullStream`，映射成 `StreamEvent` 再 `webContents.send("agent.event")`。
模式（`AgentMode`）：对标 Vercel AI SDK 7 架构，支持两大类 7 种模式：
1. **AI SDK 7 核心智能体循环 (Core Loops)**：`agent` (ToolLoopAgent 全功能自主编码)、`plan` (架构规划蓝图，只读)、`ask` (只读问答与检索，只读)、`debug` (系统性根因诊断与修复)。
2. **高阶专业工程工作流 (Specialized Engineering)**：`workflow` (WorkflowAgent 多阶段流水平水线)、`tdd` (测试驱动开发红-绿-重构循环)、`code_mode` (代码模式批量脚本执行)。
系统提示由 `systemPromptFor(mode)` 针对各模式注入；`plan` / `ask` 强制只读，其余模式写盘与终端执行按审批策略放行。
可选第二运行时：`codingRuntime: "harness"` 走 `packages/agent-harness`。已接线：Claude Code、Codex（要 Vercel 端口沙箱）、Pi（默认本机 just-bash）、OpenCode。DeepSeek 仍是占位。这是插件位，不是默认内核。

### 内置工具

| 工具 | 审批 | 说明 |
|---|---|---|
| `read_file` | 否 | 限工作区相对路径 |
| `list_dir` | 否 | |
| `glob` | 否 | 最多 400 条 |
| `grep` | 否 | 最多 200 条 |
| `todo_write` | 否 | 整表替换对话内 Todo List，不写盘 |
| `edit_file` | 是 | 工作区写 + diff |
| `write_file` | 是 | |
| `bash` | 是 | cwd 锁工作区；默认禁网；超时；输出截断 |
| `code_mode` | 是 | 写脚本再执行，走写盘 + bash 审批 |

工具输出超过约 80_000 字符截断。写 / bash / commit 集合见 `WRITE_TOOLS` / `BASH_TOOLS` / `COMMIT_TOOLS`。

审批策略来自用户偏好：`requireWriteApproval`、`requireBashApproval`、`requireCommitApproval`、`permissionMode`。UI 决定：`allow`（Allow once 仅本次）/ `deny`（拒绝）/ `allow_session`（Always allow this session 本会话总是允许，只白名单本会话工具名，不是工作区级）。界面对齐原型 Slide 6：卡片展示 Workspace、Path、Tool、Risk 四项元信息，底部标明 HMAC 令牌绑定；执行只在 main。`approval.required` 落库时用进程内密钥签 HMAC；`agent.decide` 再验库内行 + HMAC。`ApprovalDecision` `.strict()`，多传的 `args` 被拒而不是丢掉；签名校验的是落库 args，不是 renderer 再传一份。

ToolLoop `stopWhen` 走 SDK `stepCountIs` + `isLoopFinished`（当前恒 false）+ 可选 `hasToolCall`。步数来自偏好 `maxAgentSteps`（默认 20，上限 64）。`prepareStep` 每步裁历史。每步 `onStepFinish` 写 `run_steps`。总超时 `agentTimeoutMs`（0 不限）经 `withTimeout` / `armTimeout` 接到 Agent 泵和 `ai.generate`；步进超时 `stepTimeoutMs` 以 `{ stepMs }` 传给 ToolLoop。超时发 `run.error` + `generation.warning`（`code=timeout`），指标 `errorClass=timeout`。bash 用 `toolTimeoutMs`。`ai.resume` 对 cancelled/failed Agent run 用 checkpoint 快照重启同一 `runId`。

### 流事件（实现已有）

`run.start` → `text.delta` / `reasoning.delta` / `tool.*` / `approval.*` / `file.changed` / v2：`message.part.*` `structured.delta` `source.added` `asset.created` `usage.updated` `step.*` `workflow.*` `mcp.*` `realtime.*` `generation.warning` → `run.end` | `run.error`

`delegate` 独立上下文只回 `SubagentSummary`。plan/ask 只有读工具；agent/debug 用 `createCodingTools`（不含再 delegate），写盘 / bash 经 `createSubagentApproval` 挂到主 run 的 `approval.required`。没有等待器时拒绝，不偷偷执行。Workflow / Code Mode 审批仍在 main。UIMessage parts 与旧 `content` 并存。

会话消息存在 SQLite。用户轮在发送时落库。助手侧复杂载荷用 `assistant-payload` 序列化（reasoning + tool + sources / assets / structured），不要把 tool JSON 当纯文本渲染。助手 transcript / tools 挂在 `ActiveRun` 上跨审批泵累积；`complete` / `fail` / `abort` / `before-quit` 都走 `persistActiveRun`，只插一行。刷新会话时 `hydrate-thread` 优先读信封，缺失则从 `message_parts` 补回。

用户消息可带 `attachments`（资产 id）。main 按 MIME 分流后编进最后一条用户消息：`text/*` / markdown / json 等编成 `text` part；`image/*` 需模型有 `vision` 才编 `file` part；PDF 与其它二进制需 `files`。空 `File.type` 或 `application/octet-stream` 按文件名推断，不要默认当二进制。用户附件以 `message_parts` 的 `file` part 落库（按 `attachments` id 写，不依赖编模型 parts 的返回值），刷新后从 parts 恢复气泡。列出消息时若旧用户轮只有 text，按「上一轮之后、本轮发送之前」导入的资产补回 file part。跑循环前 `citeKnowledge` 检索知识库：UI 收 `source.added`，prompt 只塞片段。Composer 选 `grok-imagine-image*` / dall-e 等生图模型时走 `ai.generate` kind=`image`；`grok-imagine-video*` 走 kind=`video`（`experimental_generateVideo`），不要塞进 ToolLoop。助手落库把 `runKind` 写进 assistant-payload（`completeAgentRun` 写 `agent`，媒体生成写 `image`/`video`），刷新后 Thinking / 生图表面仍认 stamp。纯文本无 stamp 仍不包信封；有 `runKind` 必须走 JSON 信封。运行中点 Stop 走 `ai.abort`（内部也会中止 Agent）。

## 不变量

- 不在 React 组件里跑 agent 循环。
- 不把整仓源码塞进上下文；用 read / grep / glob 按需取。
- 工具被拒后模型不得用同一调用死磕（系统提示已写）。
- DeepSeek 带 tools 时必须回传上一轮 `reasoning`（见 `ChatMessage.reasoning`）。

## 代码入口

- 建 agent / 流：`packages/agent-core/src/agent.ts`
- 子 Agent 审批：`packages/agent-core/src/agents/subagent-approval.ts`、`subagent-loop.ts`
- 工具：`packages/agent-core/src/tools/index.ts`、`todo-write.ts`
- 审批：`packages/agent-core/src/tool-approval.ts`
- HMAC：`apps/desktop/src/main/services/approval-hmac.ts`、`packages/db/src/hmac.ts`
- 停止条件：`packages/agent-core/src/policies/stop.ts`
- 主进程编排：`apps/desktop/src/main/services/agent-runner.ts`（启动 / 中止 / 审批）
- 内存态：`agent-run-state.ts`；泵循环：`agent-pump.ts`；启动：`agent-run-start.ts`；附件 / 知识 / 开泵：`agent-run-prepare.ts`
- 助手落库：`agent-run-flush.ts`、`flush-agent-run.ts`、`persist-parts.ts`、`complete-agent-run.ts`；审批后是否再泵：`park-for-approval.ts`
- 知识引用：`apps/desktop/src/main/services/cite-knowledge.ts`
- 附件：`apps/desktop/src/main/services/attach-run-files.ts`
- 用户附件落库 / 旧消息回挂：`persist-user-attachments.ts`、`user-attachment-parts.ts`
- 会话上下文压缩与状态：`packages/agent-core/src/compaction/session-compactor.ts`、`apps/desktop/src/main/services/session-compaction-service.ts`（编排）、`session-compaction-store.ts`、`session-compaction-summary.ts`。压缩只改发给模型的 `ModelMessage[]`，UI 历史不删。注入一条 `[CONVERSATION SUMMARY]`，不再插虚构助手句。摘要优先 `generateText`（当前档案 `fastModelId || modelId`），失败回落规则抽取。错误码 `COMPACTION_TOO_SHORT` / `COMPACTION_NOT_ELIGIBLE`，renderer 翻词表。
- 本轮 ModelMessage 快照：`inspect-prompt-snapshot.ts`、`inspect-prompt-service.ts`；`openCodingStream` 开流时 `captureOpenStreamPrompt`。`agent.inspectPrompt` 优先未过期快照，否则 preview（已压缩则带 SUMMARY）。
- SDK 能力表：[../references/vercel-ai-sdk-7-feature-matrix.md](../references/vercel-ai-sdk-7-feature-matrix.md)

## 已知坑

- 用户在 stream 还没结束时点 Allow：必须 `resumeAfterPump`。pending 未清空时不能提前 return 丢掉该标志。consume 结束后用 `decideAfterConsume`：还有 pending 就 park；`resumeAfterPump` 且最后工具已是 `output-available` 则收工，不要只因为点过 Allow / 见过 `approval.required` 再开一轮 ToolLoop。`finally` 里若仍有 pending 不得 `pumpStream`（会把 pending 清空）。
- 总超时在进入审批等待时会清 timer，避免用户思考时被当成 timeout；恢复泵后重新计时。
- HMAC 密钥只在 main 进程内存；重启后未决审批作废，不要从 renderer 回传 hmac。
- 建工具时必须闭包注入 `AgentWorkspaceHost`。AI SDK 7 不会把 runtimeContext 传进 `execute` 的 `options.context`。
- 结构化输出在 v7 已并入 `generateText` / `streamText` 的 `output`，不要再用旧的 `generateObject` 主路径。
- 渲染线程：Thinking 用 Beautiful UI 风格 trace，不要把 `message.content` 当纯字符串倒出来。
- Harness：Claude / Codex / OpenCode 是桥接，just-bash 没有端口，不能拿来替 Vercel。Pi 才走 just-bash。OpenCode 1.0.95 的 provider-utils 品牌和 harness 1.0.94 不一致，工厂处 `as never`，不要当成运行时协议不同。
- `ai.resume` 对 Agent 是同一请求重启 ToolLoop，不是 SDK `session.detach` 中途续跑。
- Windows 上 `.md` 的 `File.type` 常为空。必须 `resolveMediaType`，否则会把文档当 `application/octet-stream` file part 发给只有 vision 的 grok，思考后报 `No output generated`。文本附件不要走多模态 file，编进 `text` part。
- 用户气泡附件消失：模型仍能读图，是因为 `attachments` 当时交给了 main，但旧 persist 只写 `messages.content` / text part。点会话或刷新走 `loadSession` → `threadFromRows`，没有 file part 就画不出缩略图。补救：发送按资产 id 写 file part；列出时按导入时间窗（上一轮之后、本轮前 2 分钟内、`source=import`）回挂孤儿资产。
- `agent.run` 以前在返回 `{ runId }` 之前 await `citeKnowledge` / 附件。Provider embed 一超时，renderer 一直 `running && !runId`：空 Thinking、Stop 点了没反应。现在 IPC 先 `run.start` + `{ runId }`，附件和检索放到 `prepareAndPump`；embed 查询 8s 封顶，失败回落词袋。
- 助手回复关应用后消失：用户轮发送时已写 SQLite，助手旧逻辑只在 `completeAgentRun` 落库。`write_file` 审批后 `sawApproval` 会立刻再泵 2～3 圈，grok 429，`failPump` 不写库，UI 里已有的流式正文重启即丢。现：`ActiveRun` 累积 transcript，失败 / 中止 / 退出都 `persistActiveRun`；工具已 `output-available` 不再自动再泵。
- 「全部」仍弹 write_file 审批：偏好已是 `requireWriteApproval: false`，SDK 对 `approved` 仍发 `tool-approval-request`（`isAutomatic: true`）再自己回 response。旧映射一律变成 `approval.required`，pending 卡住、点允许后再泵一轮，grok 报 `No output generated`。`isAutomatic` 必须丢掉，不要进 pending。
- 思考链：glob / read / write 会进 Thinking 树；模型常把整份 HTML 塞进 `reasoning`。推理节点截断到约 1200 字，避免盖住工具步骤。
