# spec/ai-capabilities

> 统一 AI Runtime、StreamEvent v2、UIMessage parts。最后更新：2026-09-20

## 当前真相

`AiRuntime` 在 `packages/agent-core/src/runtime`：`createBufferedRuntime` + `createEventBuffer`。桌面 `createDesktopRuntime.start` 走 `startGeneration`（agent 必须用 `runAgent` 自己的 runId，不能先由缓冲层另发一个）；`stream(runId)` 读 `event-bus` 同一块 `createEventBuffer`。`createIdRuntime` 才包 `createBufferedRuntime`，并注入同一缓冲。`ai-generation` 执行文本/补全（`streamPlainText`）、结构化增量（`streamStructuredPartials`，失败再 `generateStructuredRepaired`）、媒体、embedding、rerank、workflow。kind=`agent` 必须带 `workspaceId`，转发同一条 `runAgent`（同一审批与 workspace host）。fullStream 的 text-start / finish / start-step 映射为 `message.part.start` / `message.part.end` / `usage.updated` / `step.*`（文本增量走 v1 `text.delta`；`message.part.delta` 曾有合约无生产者，已删）。Workflow persist 发 `workflow.checkpoint`。MCP `tools/call` 发 `mcp.tool`；trusted `mcp.openApp` / `mcp.appMessage` 发 `mcp.app`。`ai.resume` 按 `runs.kind` 分流：workflow 走 checkpoint 续步；其它 kind 读 `runs.checkpoint` 里的 generation 快照再跑（Agent 用同一 `runId` 重启 ToolLoop，文本/结构化/媒体重放 `ai.generate`）。没有快照会拒。不要把文本/Agent run 当成 Workflow 恢复。

`GenerationRequest.kind`：`text` `structured-object` `structured-array` `completion` `image` `speech` `transcription` `translation` `video` `embedding` `rerank` `realtime-session` `agent` `workflow`。fullStream 映射在 `packages/agent-core/src/streams/map-part.ts`。Agent / `ai.generate` 完成时写 `ttfoMs` 与 `tokensPerSecond`。

StreamEvent v2 在 `packages/ipc-contract/src/stream-event.ts`：保留 v1 事件，新增 part / structured / source / asset / usage / step / workflow / mcp / realtime / warning。可选 `sequence` `timestamp` `sessionId`，由 `createEventStamper` 写入。

消息 parts：`UIMessage` + `migrateContentToParts`。旧 `messages.content` 仍是兼容字段。生成式 UI 只能选 `GENERATIVE_COMPONENT_IDS` 白名单。

实验能力（视频、Realtime）发 `generation.warning` 并带 `experimental`。

不采用：RSC、DirectChatTransport HTTP、`@ai-sdk/tui` 作桌面 UI。renderer 用 `useMainChatTransport` / `useCompletion` / `useObject` 走 IPC。长会话先 `clipHistory` 再 `pruneMessages`。语言模型经 `wrapLanguageModel` 注入默认指令与参数。

开流有效模型：会话覆盖 `sessionModels[sessionId]` > 引擎默认 > 档案 `models[0]`。同引擎换模下一轮读覆盖。助手信封可带本轮 `modelId` / `runtimeId`，hydrate 回写气泡；换模不改写旧 stamp。

聊天主路径：Composer 语言模型 → `agent.run`；`grok-imagine-*` / dall-e 等生图模型 → `ai.generate` kind=`image`（`generateImage`），带 `messages` 时把 prompt 与 `asset.created` 落库。Stop → `ai.abort`。附件 → `assets.import` + `attachments`（文本内联，图片需 vision，PDF 需 files）；`source.added` / `asset.created` / `structured.delta` 折进当前助手消息并合成白名单 `component` parts，刷新后从 payload 或 `message_parts` 恢复，parts 经 `safeValidateUIMessages`。首轮标题：乐观截断 + `ai.generate` kind=`completion` + `session.rename`。助手 Extract 走 `structured-object`。ToolLoop `stopWhen` = `[stepCountIs(maxAgentSteps), isLoopFinished(), 可选 hasToolCall]`；`prepareStep` 先 `pruneModelMessages`。`stepTimeoutMs` 以对象 `{ stepMs, toolMs }` 传给 SDK，不要传数字（会被当成总超时）。

`ENJOY_E2E_STUB=1` 时不打真实 Provider：`openCodingStream` 吐固定 fullStream（含 write 审批与附件文件名），`ai.generate` 走 `e2e-generate`。启动前设置 `ENJOY_E2E_USERDATA` + `ENJOY_E2E_WORKSPACE`，`bootstrapE2eStub` 写入 Ollama 档案（无需 Key）、`defaultModelId=stub-e2e`、会话，并索引工作区根 `.`。`agent.run` 若仍缺 `modelId` 回落 `stub-e2e`。这不是产品路径。`ai.generate.timeoutMs` 与偏好 `agentTimeoutMs` 会中止生成。

## 不变量

- 渲染进程不调模型、不读明文 Key。
- 新 IPC 入参 Zod `.strict()`，未知字段即拒。
- 旧 StreamEvent 必须仍能 `safeParse`。

## 代码入口

- 合约：`packages/ipc-contract/src/generation.ts`、`stream-event.ts`、`ui-message.ts`
- Runtime：`packages/agent-core/src/runtime/`
- Main：`apps/desktop/src/main/services/ai-generation.ts`、`desktop-runtime.ts`

## 已知坑

- 结构化输出在 v7 走 `generateText` + `Output.object()`，不要用 v4 `generateObject`。
- `useChat` HTTP 不是桌面主路径；断线重放依赖 `sequence`。
- 生成式 UI 刷新时只恢复白名单 `componentId`；未知 id 丢弃，不要当成可执行远程组件。
- 标题补全、Extract `structured-object` 与 Agent 共用 `agent.event`，必须按当前 composer `runId` 过滤。`running && !runId` 先缓冲再回放。没有认领的 `runId` 时，旁路 `structured.delta` / `run.end` 不得写进乐观助手轮，也不得 finalize。Extract / 标题 / 提交说明必须 `collectRunOutput(start)`：先订阅再 IPC。`ENJOY_E2E_STUB` 的 `ai.generate` 先返回 `runId` 再 `setTimeout(0)` 吐事件，否则 structured.delta 在订阅前就结束。
- `ai.resume` 早期无条件调用 `resumeWorkflow`，会把文本/Agent run 误当成 Workflow。现在按 `runs.kind` 分流；generation 快照不含密钥。聊天刷新恢复走 `hydrate-thread`，不是这条频道。Agent 续跑是同一请求重启循环，不是 SDK 中途 session.detach。
- kind=`agent` 必须转发 `runAgent`，不要另开无 host 的 ToolLoop；合约拒绝缺 `workspaceId`。
- `delegate`：Enjoy Local `delegate=true`（主循环注入）。plan/ask 子 Agent 也只读；agent/debug 可写，但 `createSubagentApproval` 必须走同一条 `decideApproval`。没有等待器时拒绝写盘。ACP 宿主 `delegate=false`。
- 结构化先发多次 `structured.delta`；校验失败重试一次，不要用 v4 `streamObject`。
- `experimental_streamTranscribe` 可能无导出，没有则转写回落 `transcribe`。`experimental_streamTranslate` 在 `ai@7.0.84` 有导出；`kind=translation` 走 `createTranslationModel`（OpenAI `translation()`）。不能同时读 `fullStream` 和 `translationText`。模型不合法时 `translateAudio` 返回 null。
- `WorkflowAgent` / `createMCPClient` 在 `ai@7.0.84` 仍无导出，不要假装已接官方类。
- 窗口 E2E 的发聊天 / 停止 / 恢复 / 审批走 `ENJOY_E2E_STUB`，不要在 CI 里假装打过真实 Key。stub 取最后一条非 cite 用户句（`Cite these workspace sources:` 是 `citeKnowledge` 垫的）。Stop 会 `dropEmptyPendingAssistant`，下一句和未完成用户句连在一起，不能取「本轮第一条」。Playwright Electron 不要并行起两个窗口（`workers: 1`）。
- 会话标题自动更新机制：默认标题集合包含 `新对话`、`新会话`、`New agent`、`Untitled`。`isDefaultSessionTitle` 只要当前标题处于默认集合（无论第几轮），首轮发送即触发乐观截断命名与 `useCompletion` 后台精炼，完成生成后调用 `session.rename` 持久化，支持中英文同语言自然精炼；用户已显式重命名的标题不覆盖。
