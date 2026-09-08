# spec/agent-runtime

> 主进程里的 ToolLoopAgent：流式、工具、审批、模式。最后更新：2026-09-08

## 当前真相

内核在 `packages/agent-core`（纯 TS）。Electron main 的 `agent-runner` 建模型、注入 workspace host、消费 `fullStream`，映射成 `StreamEvent` 再 `webContents.send("agent.event")`。
模式（`AgentMode`）：对标 Vercel AI SDK 7 架构，支持两大类 7 种模式：
1. **AI SDK 7 核心智能体循环 (Core Loops)**：`agent` (ToolLoopAgent 全功能自主编码)、`plan` (架构规划蓝图，只读)、`ask` (只读问答与检索，只读)、`debug` (系统性根因诊断与修复)。
2. **高阶专业工程工作流 (Specialized Engineering)**：`workflow` (WorkflowAgent 多阶段流水平水线)、`tdd` (测试驱动开发红-绿-重构循环)、`code_mode` (代码模式批量脚本执行)。
系统提示由 `systemPromptFor(mode)` 针对各模式注入；`plan` / `ask` 强制只读，其余模式写盘与终端执行按审批策略放行。
开流三分：`isAcpHostRuntime(runtimeId)` → `streamAcpTurn`；否则 `codingRuntime: "harness"` → 现有沙箱桥；否则 Enjoy Local ToolLoop。本机 CLI 契约见 [agent-cli](./agent-cli.md)。DeepSeek Harness 仍占位。外部 CLI **不是**默认内核。
思考档按模型族发：官方族与 Kimi K3 走顶层 `reasoning`；DeepSeek 用 `providerOptions.deepseek`；MiniMax-M3 用兼容层 `thinking`，`reasoning_split` 只给官方 MiniMax 域名；GLM 用 `thinking.enabled` + `reasoningEffort`。流里的 `error` 部件要抛出并解开 cause。

### 内置工具

| 工具 | 审批 | 说明 |
|---|---|---|
| `read_file` | 否 | 限工作区相对路径 |
| `list_dir` | 否 | |
| `glob` | 否 | 最多 400 条 |
| `grep` | 否 | 最多 200 条 |
| `todo_write` | 否 | 整表替换对话内 Todo List，不写盘 |
| `ask_user_questions` | 是（停车取答案，不是写盘） | 向用户提问；plan/ask 也放行。抄 Fluid AskUserQuestions 交互、BoardUI 皮 |
| `edit_file` | 是 | 工作区写 + diff |
| `write_file` | 是 | |
| `bash` | 是 | cwd 锁工作区；默认禁网；超时；输出截断 |
| `code_mode` | 是 | 写脚本再执行，走写盘 + bash 审批 |

工具输出超过约 80_000 字符截断。写 / bash / commit 集合见 `WRITE_TOOLS` / `BASH_TOOLS` / `COMMIT_TOOLS`。

审批策略来自用户偏好：`requireWriteApproval`、`requireBashApproval`、`requireCommitApproval`、`permissionMode`。UI 决定：`allow`（Allow once 仅本次）/ `deny`（拒绝）/ `allow_session`（Always allow this session 本会话总是允许，只白名单本会话工具名，不是工作区级）。卡片按工具换三种表面（抄 AICSS 交互、BoardUI 皮）：`bash` / `code_mode` / 管道与 ACP 弱名（`command` / `cmd` + `argv`）→ command（cwd 用 `args.cwd` 否则工作区 `rootPath`）；`write_file` / `edit_file` / `git_commit` → plan（待办来自本次入参，不是 Todo Dock）；`ask_user_questions` → Fluid 步进问答（数字键 1–9、可跳过、可其它）；其余 → questions（选项 id=`allow_once`/`allow_session`）。MCP 只带 `args.command` 不算 shell。底部标明 HMAC 令牌绑定；**禁止** plan 倒计时自动放行。`ask_user_questions` 的答案走 `ApprovalDecision.answers`，execute 从 `host.takeQuestionAnswers` 取出。对本工具禁止 `allow_session`（`decideApproval` 在 HMAC 落库前抛）。空问卷 execute 抛 `ASK_USER_QUESTIONS_EMPTY`。子 Agent `createCodingTools(host, { includeAskUser: false })`。Harness 静态表不登记该工具。执行只在 main。`approval.required` 落库时用进程内密钥签 HMAC；`agent.decide` 再验库内行 + HMAC。`ApprovalDecision` `.strict()`，多传的 `args` 被拒而不是丢掉；签名校验的是落库 args，不是 renderer 再传一份。

ToolLoop `stopWhen` 走 SDK `stepCountIs` + `isLoopFinished`（当前恒 false）+ 可选 `hasToolCall`。步数来自偏好 `maxAgentSteps`（默认 20，上限 64）。`prepareStep` 每步裁历史。每步 `onStepFinish` 写 `run_steps`。总超时 `agentTimeoutMs`（0 不限）经 `withTimeout` / `armTimeout` 接到 Agent 泵和 `ai.generate`；步进超时 `stepTimeoutMs` 以 `{ stepMs }` 传给 ToolLoop。超时发 `run.error` + `generation.warning`（`code=timeout`），指标 `errorClass=timeout`。bash 用 `toolTimeoutMs`。`ai.resume` 对 cancelled/failed Agent run 用 checkpoint 快照重启同一 `runId`。
运行时交互：会话任务态是派生值 `idle | running | paused | waiting_review`（审批 park = `waiting_review`，Stop 后回 `idle`，不另做可恢复 pause）。**安全检查点**在每次工具 `execute` 结束、下一跳 LLM 之前：仅 `stepNumber > 0` 才 `pullSteeringMessages` + 注入，`prepareStep` 返回的 `messages`（SDK 7.x 跨步保留）接上纠偏句；step 0 不 drain，避免首跳 LLM 前把纠偏吃掉却不注入。泵收工前再 absorb 一次；有剩余则 `continuePump` **续同一 run**，不是 idle 后再发。禁止在单次工具执行中途截断，也不要用 `abort` 当引导。`steeringQueue` 挂 main（`agent.steer`），有消息就拼成 `role: user`。ACP/CLI 没有 `prepareStep`，引导要等当前流走完再由泵 absorb。`followupQueue` 在 renderer：`run.end` / idle 后自动 `agent.run`；已 idle 再入队也必须立刻自启（订阅队列，不能只听 `running` 边沿）。`waiting_review`（`pendingApproval`）时不要 `takeNextFollowup`。没有 ActiveRun 且已 idle 的引导立刻新开 `agent.run`；UI 仍 `running` 才改排队。引用块用 `QuotedContext`（规范类型 `file|diff|terminal_output|task_step`，兼容旧 `tool_call|file_diff|text_selection|thought_step`；正文优先 `content`，否则 `snippet`）格式化后拼在用户句前。排队项规范字段是 `prompt`，`text` 为同值别名；编辑走 `editQueuedMessage`，升纠偏走 `elevateToSteer`（标 `elevated_to_steer`）。Stop / fail / 正常收工后 `clearSteer`，未消费纠偏丢弃且不注入下一轮（已落库的用户气泡保留）。
助手轮末尾可带静态 **ActionChip**（正文围栏 `:::enjoy-actions`，落库进 assistant-payload）。这是建议词，不是纠偏。未点击必须保持 idle，禁止倒计时或回合结束自动发送建议。空闲点击 = 新开 `agent.run`；运行中 `queue` 入 followupQueue（提示「已加入执行队列」），`fill_input` 只回填输入框。排队条上的「立即纠偏」才是 Elevate to Steer。

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
- 工具：`packages/agent-core/src/tools/index.ts`、`todo-write.ts`、`ask-user-questions.ts`
- 审批：`packages/agent-core/src/tool-approval.ts`
- 审批 UI 三表面：`apps/desktop/src/renderer/src/components/ai-chat/thread/approval/`（`classify-approval.ts`）
- HMAC：`apps/desktop/src/main/services/approval-hmac.ts`、`packages/db/src/hmac.ts`
- 停止条件：`packages/agent-core/src/policies/stop.ts`
- 主进程编排：`apps/desktop/src/main/services/agent-runner.ts`（启动 / 中止 / 纠偏 / 审批）
- 纠偏队列：`runtime-interact/steering-queue.ts`、`steer-agent.ts`、`absorb-steering.ts`；检查点：`prepare-step.ts`（`mergeSteeringMessages`，仅 step≥1 注入）+ `agent-pump` 收工前 `absorbSteering`
- 引导词：`packages/ipc-contract/src/action-chip.ts`；点击分流 `action-chip-intent.ts` / `apply-action-chip.ts`；气泡 `message-action-chips.tsx`
- 排队 / 草稿：`hooks/followup-queue.ts`、`followup-autostart.ts`；发送拆到 `hooks/runtime-interact/`（`composer-draft` / `steer-composer` / `send-composer-run`）
- 内存态：`agent-run-state.ts`；泵循环：`agent-pump.ts`；启动：`agent-run-start.ts`；附件 / 知识 / 开泵：`agent-run-prepare.ts`
- 助手落库：`agent-run-flush.ts`、`flush-agent-run.ts`、`persist-parts.ts`、`complete-agent-run.ts`；审批后是否再泵：`park-for-approval.ts`
- 知识引用：`apps/desktop/src/main/services/cite-knowledge.ts`
- 附件：`apps/desktop/src/main/services/attach-run-files.ts`
- 用户附件落库 / 旧消息回挂：`persist-user-attachments.ts`、`user-attachment-parts.ts`
- 会话上下文压缩与状态：`packages/agent-core/src/compaction/session-compactor.ts`、`apps/desktop/src/main/services/session-compaction-service.ts`（编排）、`session-compaction-store.ts`、`session-compaction-summary.ts`。压缩只改发给模型的 `ModelMessage[]`，UI 历史不删。注入一条 `[CONVERSATION SUMMARY]`，不再插虚构助手句。摘要优先 `generateText`（当前档案 `fastModelId || modelId`），失败回落规则抽取。错误码 `COMPACTION_TOO_SHORT` / `COMPACTION_NOT_ELIGIBLE`，renderer 翻词表。
- 本轮 ModelMessage 快照：`inspect-prompt-snapshot.ts`、`inspect-prompt-service.ts`；`openCodingStream` 开流时 `captureOpenStreamPrompt`。`agent.inspectPrompt` 优先未过期快照，否则 preview（已压缩则带 SUMMARY）。
- SDK 能力表：[../references/vercel-ai-sdk-7-feature-matrix.md](../references/vercel-ai-sdk-7-feature-matrix.md)

## 已知坑

- 纠偏不能 `abort` 当前工具。`agent.steer` 只入队；`prepareStep` 仅 `stepNumber > 0` 才 drain+注入（SDK 跨步保留）/ 泵结束才 absorb。step 0 若仍 `pullSteeringMessages()` 会把队列抽空却不注入。`prepareStep` 与 `run.messages` 可能同引用，必须 `mergeSteeringMessages` 去重，禁止再拼一套。没有 ActiveRun：已 idle 立刻 `agent.run`；UI 仍 running 才进 followup 等自启。fail / 收工 / Stop 都 `clearSteer`，避免下一轮把已落库的纠偏再注一次。
- 消息底 ActionChip 与排队条「立即纠偏」不是同一件事。Chip 未点击不得自动跑；idle 后自动消费的只是用户主动入队的 followupQueue。`waiting_review` 不要自启下一轮。围栏必须从可见 Markdown 剥离，不要把 `:::enjoy-actions` 渲染进气泡。idle 点 Chip 必须 `takeQuotedContexts` 并进本轮 Prompt，否则引用会漏到下一轮。
- 用户在 stream 还没结束时点 Allow：必须 `resumeAfterPump`。pending 未清空时不能提前 return 丢掉该标志。consume 结束后用 `decideAfterConsume`：还有 pending 就 park；`resumeAfterPump` 且最后工具已是 `output-available` 则收工，不要只因为点过 Allow / 见过 `approval.required` 再开一轮 ToolLoop。`finally` 里若仍有 pending 不得 `pumpStream`（会把 pending 清空）。
- 总超时在进入审批等待时会清 timer，避免用户思考时被当成 timeout；恢复泵后重新计时。
- HMAC 密钥只在 main 进程内存；重启后未决审批作废，不要从 renderer 回传 hmac。
- AICSS Approval Card 的 plan 变体会 30s 倒计时后自动 `onApprove`。本产品不允许：没有倒计时 UI，也没有静默放行。写盘 / bash / commit 必须等人点允许、拒绝或本会话允许。
- 审批分类：ACP 弱名 `command` + `argv` 走 command；不要用「有 args.command」把 MCP 收成 shell。questions 的 Continue 按选项 id 分流，禁止和 `t("chat.alwaysAllow")` 比字符串。
- `ask_user_questions` 不是写盘，plan/ask 不得当只读拒绝。不要原样上架 Fluid registry（Base UI、framer-motion、Lucide、`bg-card`）。答案不能塞进 HMAC 校验的落库 args；放行后放 `ActiveRun.questionAnswers`，execute 再 take。禁止对本工具 `allow_session`：必须在 `recordApprovalDecision` 之前抛，否则库内行写死、卡片还停着。`toHarnessApprovalSettings` 不要登记该工具（ACP/CLI 没有 `createCodingTools`）。tool-approval 的 node:test 不能 value-import ipc-contract 入口（缺 `permission-mode`），工具名常量放 `ask-user-questions-name.ts`。
- 建工具时必须闭包注入 `AgentWorkspaceHost`。AI SDK 7 不会把 runtimeContext 传进 `execute` 的 `options.context`。
- 结构化输出在 v7 已并入 `generateText` / `streamText` 的 `output`，不要再用旧的 `generateObject` 主路径。
- 渲染线程：Thinking 用 Beautiful UI 风格 trace，不要把 `message.content` 当纯字符串倒出来。
- Harness：Claude / Codex / OpenCode 是桥接，just-bash 没有端口，不能拿来替 Vercel。Pi 才走 just-bash。OpenCode 1.0.95 的 provider-utils 品牌和 harness 1.0.94 不一致，工厂处 `as never`，不要当成运行时协议不同。
- ToolLoop 在模型不再调工具时就会 `run.end`，哪怕 Todo List 还停在 `in_progress`。Grok 常搜完工作区后写一段计划文字就收工。同 run 最多自动再泵 2 次，且必须已有 `in_progress` 项（`shouldContinueOpenTodos`）；用尽后 Dock 出「继续」。续跑 `persistUser: false`。不要把「已停止」当成崩溃。
- `ai.resume` 对 Agent 是同一请求重启 ToolLoop，不是 SDK `session.detach` 中途续跑。
- Windows 上 `.md` 的 `File.type` 常为空。必须 `resolveMediaType`，否则会把文档当 `application/octet-stream` file part 发给只有 vision 的 grok，思考后报 `No output generated`。文本附件不要走多模态 file，编进 `text` part。
- 用户气泡附件消失：模型仍能读图，是因为 `attachments` 当时交给了 main，但旧 persist 只写 `messages.content` / text part。点会话或刷新走 `loadSession` → `threadFromRows`，没有 file part 就画不出缩略图。补救：发送按资产 id 写 file part；列出时按导入时间窗（上一轮之后、本轮前 2 分钟内、`source=import`）回挂孤儿资产。
- `agent.run` 以前在返回 `{ runId }` 之前 await `citeKnowledge` / 附件。Provider embed 一超时，renderer 一直 `running && !runId`：空 Thinking、Stop 点了没反应。现在 IPC 先 `run.start` + `{ runId }`，附件和检索放到 `prepareAndPump`；embed 查询 8s 封顶，失败回落词袋。
- 助手回复关应用后消失：用户轮发送时已写 SQLite，助手旧逻辑只在 `completeAgentRun` 落库。`write_file` 审批后 `sawApproval` 会立刻再泵 2～3 圈，grok 429，`failPump` 不写库，UI 里已有的流式正文重启即丢。现：`ActiveRun` 累积 transcript，失败 / 中止 / 退出都 `persistActiveRun`；工具已 `output-available` 不再自动再泵。
- 「全部」仍弹 write_file 审批：偏好已是 `requireWriteApproval: false`，SDK 对 `approved` 仍发 `tool-approval-request`（`isAutomatic: true`）再自己回 response。旧映射一律变成 `approval.required`，pending 卡住、点允许后再泵一轮，grok 报 `No output generated`。`isAutomatic` 必须丢掉，不要进 pending。
- 自定义 `/v1` 选 `minimax-m3` 报 `No output generated`：模型带思考。错在用了 `createOpenAI`（丢掉 `reasoning_content`）还把 `reasoning: xhigh` 发给只要 `thinking.adaptive` 的 MiniMax。改走 `createOpenAICompatible` + MiniMax thinking 选项。`classifyError` 必须解开 cause / responseBody。
- 思考链：glob / read / write 会进 Thinking 树；模型常把整份 HTML 塞进 `reasoning`。推理节点截断到约 1200 字，避免盖住工具步骤。
