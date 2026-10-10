# spec/ai-capabilities

> 统一 AI Runtime、StreamEvent v2、UIMessage parts。最后更新：2026-10-10（终态也带 kind；空闲只收回挂家族；标题补全不认领前台）

## 当前真相

`AiRuntime` 在 `packages/agent-core/src/runtime`：`createBufferedRuntime` + `createEventBuffer`。桌面 `createDesktopRuntime.start` 走 `startGeneration`（agent 必须用 `runAgent` 自己的 runId，不能先由缓冲层另发一个）；`stream(runId)` 读 `event-bus` 同一块 `createEventBuffer`。`createIdRuntime` 才包 `createBufferedRuntime`，并注入同一缓冲。`ai-generation` 执行文本/补全（`streamPlainText`）、结构化增量（`streamStructuredPartials`，失败再 `generateStructuredRepaired`）、媒体、embedding、rerank、workflow。kind=`agent` 必须带 `workspaceId`，转发同一条 `runAgent`（同一审批与 workspace host）。fullStream 的 text-start / finish / start-step 映射为 `message.part.start` / `message.part.end` / `usage.updated` / `step.*`（文本增量走 v1 `text.delta`；`message.part.delta` 曾有合约无生产者，已删）。Workflow persist 发 `workflow.checkpoint`。MCP `tools/call` 发 `mcp.tool`；trusted `mcp.openApp` / `mcp.appMessage` 发 `mcp.app`。`ai.resume` 按 `runs.kind` 分流：workflow 走 checkpoint 续步；其它 kind 读 `runs.checkpoint` 里的 generation 快照再跑（Agent 用同一 `runId` 重启 ToolLoop，文本/结构化/媒体重放 `ai.generate`）。没有快照会拒。不要把文本/Agent run 当成 Workflow 恢复。

`GenerationRequest.kind`：`text` `structured-object` `structured-array` `completion` `image` `speech` `transcription` `translation` `video` `embedding` `rerank` `realtime-session` `agent` `workflow`。fullStream 映射在 `packages/agent-core/src/streams/map-part.ts`：SDK 连字符部件按原规则折；已是点号的 Enjoy / ACP 事件只放行显式白名单（原 7 种 + `session.title` / `session.config` / `usage.updated` / `generation.warning` + `commands.update` / `mcp.app`），未知点号类型丢弃。`emitEvent` / `stampAndSend` 出站再 `StreamEvent.safeParse`，失败丢弃并计数（开发态全量 `console.warn`，生产态按 type 10s 限速）；`stampAndSend` / `stampAndBroadcast` 丢掉时返回 `null`，不要把原事件当已发送。终态 `run.end` / `run.error` 被闸丢掉时，`emitEvent` 仍 `settleRun`，避免 `waitForRunSettle` 挂死。映射层先把边沿形状修到可过闸：ACP MCP App 标题截到 200，`srcDoc` 超过 200000 发 `mcp.app` `phase:"error"` + `generation.warning`（`mcp_app_srcdoc_too_large`，不带超长 srcDoc）；ACP `session.title` 截到 200；`host.inject` 名称截到 120、名单封顶 128；`usage.updated` token 四舍五入成整数；`source.added` 的 NaN score 丢掉字段。Agent / `ai.generate` 完成时写 `ttfoMs` 与 `tokensPerSecond`。

StreamEvent v2 在 `packages/ipc-contract/src/stream-event.ts`：保留 v1 事件，新增 part / structured / source / asset / usage / step / workflow / mcp / realtime / warning / `host.inject`（本轮 Enjoy SoT Skills/MCP 快照，开流由 `agent-pump` 发出，不落库）/ `session.config`（ACP `configOptions` 与 `config_option_update`，选项形状复用 `SessionConfigOption`；思考档认 `thought_level` 或 `effort` / `reasoning_effort`）/ `session.title`（`session_info_update`，仅默认标题时 `session.rename`）。`run.start` / `run.end` / `run.error` 可带可选 `kind`（Composer / 恢复为 `agent`；标题补全等旁路带自己的 generation kind；旧事件缺字段 `.catch(undefined)` 仍过闸）。可选 `sequence` `timestamp` `sessionId`，由 `createEventStamper` 写入。

消息 parts：`UIMessage` + `migrateContentToParts`。旧 `messages.content` 仍是兼容字段。生成式 UI 只能选 `GENERATIVE_COMPONENT_IDS` 白名单。

实验能力（视频、Realtime）发 `generation.warning` 并带 `experimental`。

不采用：RSC、DirectChatTransport HTTP、`@ai-sdk/tui` 作桌面 UI。renderer 用 `useMainChatTransport` / `useCompletion` / `useObject` 走 IPC。长会话先 `clipHistory` 再 `pruneMessages`。语言模型经 `wrapLanguageModel` 注入默认指令与参数。

开流有效模型：会话覆盖 `sessionModels[sessionId]` > 引擎默认 > 档案 `models[0]`。同引擎换模下一轮读覆盖。助手信封可带本轮 `modelId` / `runtimeId`，hydrate 回写气泡；换模不改写旧 stamp。

聊天主路径：Composer 语言模型 → `agent.run`；`grok-imagine-*` / dall-e 等生图模型 → `ai.generate` kind=`image`（`generateImage`），带 `messages` 时把 prompt 与 `asset.created` 落库。Stop → `ai.abort`。附件 → `assets.import` + `attachments`（文本内联，图片需 vision，PDF 需 files）；`source.added` / `asset.created` / `structured.delta` 折进当前助手消息并合成白名单 `component` parts，刷新后从 payload 或 `message_parts` 恢复，parts 经 `safeValidateUIMessages`。首轮标题：乐观截断立刻 `session.rename`；后台 `ai.generate` kind=`completion` 精炼（占位名或本轮乐观截断都可覆盖，用户手改不覆盖）。ACP 精炼用 Enjoy `preferredModelId` / `defaultModelId`，禁止拿 CLI modelId 去 vault。标题 / 补全 `run.start` 仍带 sessionId 供 stamper，但 `belongsToForeground` / `reduceStreamEvent` 只认领 Composer 发起的 `run.start`（`kind==="agent"` 或带 prompt）；`collectRunOutput` 继续按 `runId` 收文本。助手 Extract 走 `structured-object`。ToolLoop `stopWhen` = `[stepCountIs(maxAgentSteps), isLoopFinished(), 可选 hasToolCall]`；`prepareStep` 先 `pruneModelMessages`。`stepTimeoutMs` 以对象 `{ stepMs, toolMs }` 传给 SDK，不要传数字（会被当成总超时）。

`ENJOY_E2E_STUB=1` 时不打真实 Provider：`openCodingStream` 吐固定 fullStream（含 write 审批与附件文件名），`ai.generate` 走 `e2e-generate`。启动前设置 `ENJOY_E2E_USERDATA` + `ENJOY_E2E_WORKSPACE`，`bootstrapE2eStub` 写入 Ollama 档案（无需 Key）、`defaultModelId=stub-e2e`、会话（条数 `ENJOY_E2E_SESSION_COUNT`，默认 1；种满侧栏用 30），并索引工作区根 `.`。`ENJOY_E2E_WORKSPACES=2` 再种一个并列项目。`ENJOY_E2E_CHAT_READY=key` 种可发 stub 密钥档案；`=engine` 种已登录 Claude stub（inspect + 列表覆盖），只种一次且必须是隔离 userData。默认空会话没有工具行，顶栏「本轮账本」不出现。`ENJOY_E2E_LEDGER=1` 或 `pnpm --filter @enjoy-agents/desktop dev:auto-p2`（已带该旗标与 `ENJOY_DEV_SEED_AUTO_P2`）额外种一题为「本轮账本」的会话（若干长命令 + 读/改），用来验 1100 宽截断。含 `write` 的提示先吐 `write_file` 审批；允许后 stub 先吐匹配 `toolCallId` 的 `tool-result`，再写入工作区 `e2e-stub.txt`，最后才 `stub-ok allowed write`（活泵有 waiter，不会走 `executeStoredTool`）。含 `very slow` 的提示约 1.5s 一词、共约 15s，前半段后停一张写盘审批（允许后续后半段），用来验 Stop →「已停止」与写后 Stop → 待验收。`agent.run` 若仍缺 `modelId` 回落 `stub-e2e`。未打包时发送 `stub store error` / `夹具：存储失败` 让 stub 抛 `INTERNAL_STORE_ERROR`（UI「这次没执行成功，请再试一次。」）；`app.isPackaged` 不生效。这不是产品路径。`ai.generate.timeoutMs` 与偏好 `agentTimeoutMs` 会中止生成。

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
- **隐患**：主 run 收工后，标题补全的 `run.start` 若只凭同 session + 空闲就被 `belongsToForeground` 认领，reducer 会把它当成活跃 run，随后 `text.delta` 打开空助手气泡。正确做法：只认领 `kind==="agent"` 或带 prompt 的 `run.start`；旁路 generation 带自己的 kind（`completion` 等）。
- **隐患**：标题补全超时的 `run.error("Request timed out")` 曾写到当前会话横幅，甚至在没有后台 park 时新建停车。根因：空闲时任意带 `runId` 的 `run.error` 都会 `shouldFinalizeComposerRun`；`isNonAgentRunKind` 只看事件字段，而终态以前不带 `kind`。正确做法：`ai.generate` 终态也 stamp `kind`；`rememberRun` 记下 `(runId, kind)`，两层按 runId 排除旁路；空闲只收回挂家族码（`restore_no_matching_approval` / `restore_restart_cancelled`）。
- `ai.resume` 早期无条件调用 `resumeWorkflow`，会把文本/Agent run 误当成 Workflow。现在按 `runs.kind` 分流；generation 快照不含密钥。聊天刷新恢复走 `hydrate-thread`，不是这条频道。Agent 续跑是同一请求重启循环，不是 SDK 中途 session.detach。
- kind=`agent` 必须转发 `runAgent`，不要另开无 host 的 ToolLoop；合约拒绝缺 `workspaceId`。
- `delegate`：Enjoy Local `delegate=true`（主循环注入）。plan/ask 子 Agent 也只读；agent/debug 可写，但 `createSubagentApproval` 必须走同一条 `decideApproval`。没有等待器时拒绝写盘。ACP 宿主 `delegate=false`。
- 结构化先发多次 `structured.delta`；校验失败重试一次，不要用 v4 `streamObject`。
- `experimental_streamTranscribe` 可能无导出，没有则转写回落 `transcribe`。`experimental_streamTranslate` 在 `ai@7.0.84` 有导出；`kind=translation` 走 `createTranslationModel`（OpenAI `translation()`）。不能同时读 `fullStream` 和 `translationText`。模型不合法时 `translateAudio` 返回 null。
- `WorkflowAgent` / `createMCPClient` 在 `ai@7.0.84` 仍无导出，不要假装已接官方类。
- 窗口 E2E 的发聊天 / 停止 / 恢复 / 审批走 `ENJOY_E2E_STUB`，不要在 CI 里假装打过真实 Key。stub 取最后一条非 cite 用户句（`Cite these workspace sources:` 是 `citeKnowledge` 垫的）。Stop 会 `dropEmptyPendingAssistant`，下一句和未完成用户句连在一起，不能取「本轮第一条」。Playwright Electron 不要并行起两个窗口（`workers: 1`）。
- 会话标题自动更新机制：默认标题集合包含 `新对话`、`新会话`、`未命名会话`、`New agent`、`Untitled`、`Untitled session`。首轮发送立刻乐观截断并落库；`shouldRefineSessionTitle` 在占位名或本轮乐观截断时才跑 `useCompletion` 精炼，再 `session.rename`。ACP 用 Enjoy 默认文本模型，不用 CLI modelId。用户已显式重命名的标题不覆盖。`session_info_update` 仍只覆盖占位名。
- **隐患**：探索态 / 目标围栏曾写进侧栏标题。正确做法：`stripTitleSource` 后再乐观截断与精炼；精炼按发起时的 sessionId 回写，不跟前台切走。
