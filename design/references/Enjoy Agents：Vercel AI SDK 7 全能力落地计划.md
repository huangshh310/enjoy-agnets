# Enjoy Agents：Vercel AI SDK 7 全能力落地计划

## 总结与边界

基于 [AI SDK 7 功能矩阵](C:/myfile/workspaces/proj/enjoy-agents/design/references/vercel-ai-sdk-7-feature-matrix.md)，目标是实现所有适合本地 Agent IDE 的产品能力：文本、结构化输出、工具 Agent、Workflow、RAG、多模态、媒体、MCP、Harness、审批、可恢复执行、Telemetry 与模型能力探测。

AI SDK 7 已将 Agent、文件/技能上传、Workflow、Sandbox、Harness、Telemetry、语音、图像和视频纳入统一平台；其运行要求 Node.js 22 与 ESM，本仓库当前配置已经满足。[官方发布说明](https://vercel.com/changelog/ai-sdk-7)

本计划采用以下已确认决策：

- 单一大版本交付；内部按依赖顺序分波次实施，但不拆成独立产品版本。
- 实验能力默认开放，但必须显示实验标记、能力探测、失败隔离和降级提示。
- 本地优先：SQLite、Agent 主循环、审批、Workflow 状态、MCP 编排都在 Electron main；Gateway、Vercel Sandbox、云媒体和外部 OTEL 仅作为可选适配器。
- 主体验是统一 Agent 工作区；Knowledge、Workflows、Media、MCP、Observability 使用独立 Hash 路由。
- RAG 仅索引用户显式选择的文件或文件夹；遵守 `.gitignore` 和敏感文件排除规则。
- 生成/上传媒体保存到应用资产库；写入工作区必须显式导出并走审批。
- Workflow 在应用运行时执行；退出后暂停，重新启动时从最近检查点恢复。
- MCP 使用逐服务器白名单、工具分级审批和隔离 iframe。
- Provider 采用分层适配：每类能力至少提供两条可用路径，同时保留 Gateway、OpenAI-compatible 和 Custom Endpoint 扩展，不为每个供应商复制一套 UI。
- 已调用 skills：`grilling`、`codebase-design`。

## 模块与目录规划

```text
packages/agent-core/src/
  agents/              ToolLoopAgent、WorkflowAgent、Subagent、Harness 编排
  generation/          文本、结构化输出、补全、对象流
  media/               图像、语音、转写、视频、实时会话
  knowledge/           embedding、检索、rerank、引用构建
  streams/             AI SDK StreamPart → 本地 StreamEvent/UIMessage
  policies/            审批、超时、fallback、停止条件、HMAC
  observability/       本地指标、脱敏、OTEL 适配
  tools/               内置工具、dynamicTool、MCP 工具桥

packages/providers/src/
  registry/             createProviderRegistry 与模型别名
  capabilities/         Provider/Model 能力探测与缓存
  language/             OpenAI、Anthropic、Gateway、兼容端点
  media/                image、speech、transcription、video、realtime
  embeddings/           embedding 与 rerank Provider
  middleware/           wrapLanguageModel、fallback、缓存、护栏

packages/knowledge/src/
  sources/              来源管理、忽略规则、增量索引
  parsers/              text、Markdown、代码、PDF 等解析器
  indexer/              分块、embedding、批量任务
  retriever/            cosineSimilarity、过滤、引用 metadata
  store/                SQLite 向量与文档存储适配器

packages/assets/src/
  asset-store.ts        应用资产库
  provider-refs.ts      uploadFile/uploadSkill 引用缓存
  export-policy.ts      导出到工作区的审批与路径校验

packages/mcp/src/
  client.ts             createMCPClient 生命周期
  registry.ts           Server、Tool、Resource 注册
  permissions.ts        server/tool/app 权限策略
  app-host.ts            MCP App iframe 与 JSON-RPC 桥

packages/db/src/
  migrations/            SQLite schema version、迁移和回滚检查
  repositories/          runs、steps、assets、knowledge、mcp、metrics

apps/desktop/src/main/services/
  agent-runner.ts        薄编排层，仅负责窗口、会话和 IPC
  ai-generation.ts       非 Agent 生成任务入口
  workflow-runner.ts     durable run、checkpoint、resume
  media-service.ts       二进制输入输出与资产库
  knowledge-service.ts   索引/检索任务
  mcp-service.ts         MCP 连接和 App 资源
  telemetry-service.ts   本地指标和 OTEL 出口

apps/desktop/src/renderer/src/
  components/ai-chat/    UIMessage parts、工具、审批、来源、媒体、生成式 UI
  components/knowledge/  来源、索引状态、搜索结果
  components/workflows/  Workflow 列表、步骤、暂停/恢复/重试
  components/media/      资产库、预览、导出
  components/mcp/        Server、Tool、App 权限
  components/observability/ 本地指标与导出
  hooks/                  MainChatTransport、useCompletion、useObject、Realtime
```

拆分理由：`packages/agent-core` 保留 Agent 领域主接缝，内部按能力拆分，避免把 SDK 调用、审批、媒体和 Workflow 混进一个巨型文件；`knowledge`、`assets`、`mcp` 具有独立持久化、安全边界和测试替身，适合成为深模块。

## 核心接口与数据流

### 1. 统一 AI Runtime 接口

新增内部深模块 `AiRuntime`，对 main 暴露少量接口：

```ts
interface AiRuntime {
  start(request: GenerationRequest): Promise<{ runId: string }>
  stream(runId: string): AsyncIterable<RuntimeEvent>
  decideApproval(input: ApprovalDecision): Promise<void>
  abort(runId: string): Promise<void>
  resume(runId: string): Promise<void>
}
```

`GenerationRequest` 支持：

- `text`
- `structured-object`
- `structured-array`
- `completion`
- `image`
- `speech`
- `transcription`
- `video`
- `embedding`
- `rerank`
- `realtime-session`
- `agent`
- `workflow`

所有请求统一带 `providerId`、`modelId`、`runtimeContext`、`attachments`、`timeout`、`telemetryPolicy` 和 `sessionId`。Provider、资产库、向量库、审批器和 Telemetry 都通过适配器注入，测试使用内存实现。

### 2. StreamEvent v2

保留现有 `run.start/end/error`、文本、推理、工具和审批事件，扩展：

- `message.part.start/delta/end`
- `structured.delta`
- `source.added`
- `asset.created`
- `usage.updated`
- `step.start/end`
- `workflow.checkpoint`
- `workflow.paused/resumed`
- `mcp.tool`
- `mcp.app`
- `realtime.audio/text/status`
- `generation.warning`

每个事件增加 `sequence`、`timestamp`、`sessionId`，renderer 按序消费并支持断线重放。旧事件保持兼容，避免破坏已有会话。

### 3. SQLite 迁移

在现有四张表基础上增加：

- `schema_migrations`
- `message_parts`
- `runs`
- `run_steps`
- `approvals`
- `assets`
- `provider_file_refs`
- `knowledge_sources`
- `knowledge_documents`
- `knowledge_chunks`
- `knowledge_embeddings`
- `mcp_servers`
- `mcp_permissions`
- `telemetry_metrics`

消息从单一字符串逐步迁移为版本化 parts；旧 `messages.content` 保留作为兼容字段。二进制只存 `userData/assets`，SQLite 保存 hash、媒体类型、大小、来源和 provider reference。

## 功能实现分组

### A. Core 与 UI

- `generateText` / `streamText`：普通文本、平滑流、停止、超时、fallback。
- `Output.object()` / `Output.array()`：Zod、JSON Schema、Valibot 适配；支持结构化增量流和校验错误恢复。
- `reasoning`、`prepareStep`、`stopWhen`、`stepCountIs`、`hasToolCall`、`isLoopFinished`。
- `useChat` 语义迁移到 `MainChatTransport`：renderer 通过 preload/IPC 获取 UIMessage parts，不让 `useChat` 直接请求 HTTP 或读取密钥。
- `useCompletion` 用于 Prompt Bar、代码补全和标题生成。
- `useObject` 用于结构化卡片、表单和抽取任务。
- `convertToModelMessages`、`pruneMessages`、`validateUIMessages`、`readUIMessageStream` 接入持久化与恢复。
- AI Elements 负责 Conversation、Message、Reasoning、Tool、Confirmation、Source、Attachment 和生成式 UI；模型只能选择白名单 `componentId`，不能直接注入 React。

`DirectChatTransport`、HTTP Response 管道和 RSC 不作为桌面主路径；用本地 IPC Transport 和 AI SDK UI 流达到相同能力。RSC 保留为明确“不采用”的架构决策。AI SDK 官方也建议新产品优先使用 UI 层而非 RSC。

### B. Agent、Workflow、Harness、Sandbox

- 保留并深化现有 `ToolLoopAgent`，将内置工具、审批、上下文和流事件下沉到 `agent-core`。
- 新增 `WorkflowAgent` durable adapter：每步保存输入摘要、工具调用、审批状态、模型结果、耗时和 checkpoint；支持暂停、恢复、重试、取消和崩溃恢复。
- 子 Agent 通过 `delegate` 工具调用，独立上下文，主 Agent 只接收结构化摘要；子 Agent 不允许绕过主审批策略。
- `runtimeContext` 传租户、工作区、会话和运行状态；`toolsContext/contextSchema` 只传给需要的工具，密钥不进入 prompt。
- Harness 统一 Claude Code、Codex、Pi、OpenCode 等适配器，沿用现有 `packages/agent-harness`。
- `Code Mode` 作为受审批的代码生成与执行工具；默认使用本地受限 Sandbox，支持可选 Vercel Sandbox。
- Sandbox 默认限制 cwd、环境变量、进程树、超时、输出大小和网络；写盘、提交、外部网络继续遵守审批。
- `@ai-sdk/tui` 只作为开发测试脚本，不作为桌面运行时 UI。AI SDK 的 Workflow、Sandbox 和 Harness 都属于 AI SDK 7 的生产 Agent 能力。[官方说明](https://vercel.com/changelog/ai-sdk-7)

### C. Provider 与能力探测

扩展 `ProviderCapability`：

```ts
type ProviderCapability =
  | "text" | "streaming" | "reasoning" | "tools" | "structured"
  | "vision" | "files" | "skills" | "image" | "embedding"
  | "rerank" | "speech" | "transcription" | "realtime" | "video"
```

每个模型记录静态目录能力和动态探测结果；UI 对不支持能力禁用控件并显示可读原因。

首批适配层：

- 语言：OpenAI Chat/Responses、Anthropic、AI Gateway、OpenAI-compatible/Custom。
- 图像：OpenAI + Fal/Replicate。
- 语音/转写：OpenAI + ElevenLabs/Deepgram。
- 视频：Fal + Replicate；保留 xAI/Google/Gateway 扩展。
- Embedding/Rerank：OpenAI/Gateway + Cohere 或兼容端点。
- 文件/技能：OpenAI `uploadFile`、Anthropic `uploadSkill`，并使用 hash 缓存 provider reference。
- Realtime：OpenAI、Google、xAI/Gateway；由 main 代理 WebSocket，renderer 不持有 Provider Key。

使用 `createProviderRegistry`、`wrapLanguageModel`、`wrapImageModel`、默认指令/参数 middleware、fallback 和模型级配置。所有 provider 请求仍在 main 进程。

### D. 附件、媒体与资产库

- 新增 native file picker 和 `assets.import` IPC。
- 图片、PDF、音频、视频先进入资产库，再按模型能力转换为 inline file、URL 或 provider reference。
- 支持 `uploadFile`/`uploadSkill`，引用按 provider、模型族、文件 hash、权限范围缓存。
- 生成图片、语音和视频后发出 `asset.created`，在聊天中以内联预览显示。
- 导出到工作区使用 `assets.export`，展示目标路径和覆盖风险，必须审批。
- Realtime 由 main 管理音频编解码、会话 token、心跳、重连和工具调用；renderer 只传输音频帧与显示状态。
- 视频和 Realtime 默认标注实验能力；超时、轮询、下载大小和断线都必须可恢复。AI SDK 7 将 Realtime 与视频标为实验能力，语音和转写作为统一媒体 API。[官方说明](https://vercel.com/changelog/ai-sdk-7)

### E. Knowledge / RAG

- Knowledge 路由提供来源添加、索引状态、失败重试、删除和搜索。
- 用户显式选择文件/目录；应用自动排除 `.git`、构建目录、密钥文件和 `.gitignore` 匹配项。
- 解析器覆盖 Markdown、纯文本、TypeScript/JavaScript、JSON、配置文件和 PDF；解析失败不会阻塞其他文件。
- 使用确定性 chunk ID、文件 hash 和增量索引；embedding 批量执行。
- SQLite 保存向量与 chunk metadata，本地执行 `cosineSimilarity`；可选 provider rerank。
- 检索结果进入 `sources` metadata，不把整篇文档直接塞入 prompt。
- 聊天展示来源文件、行号、相关片段和跳转到 Files 视图的操作。
- 索引任务支持暂停、取消、断点恢复和 Provider 变更后的重建。

### F. MCP 与生成式 UI

- `createMCPClient` 仅在 main 使用；支持 stdio、SSE/Streamable HTTP，并统一 server 生命周期。
- Server 配置包括 transport、命令/URL、环境变量引用、允许的资源 URI、允许的模型可见工具和 app-only 工具。
- 连接、工具调用、写操作和资源读取分级审批；默认不信任新 Server。
- MCP App 使用隔离 iframe、严格 CSP、无 Node 集成、受限 `postMessage` JSON-RPC、资源 URI 白名单和工具 allowlist。
- MCP App 支持工具结果、资源、日志和 display update；异常时退化为结构化工具结果。
- `experimental_MCPAppRenderer` 只负责渲染已批准 App，不允许任意远程脚本直接访问本地文件。AI SDK 7 已将 MCP Apps、模型可见工具和 App-only 工具纳入 Agent 集成。[官方说明](https://vercel.com/changelog/ai-sdk-7)

### G. Production、Telemetry 与错误体系

- 本地默认记录模型、步骤、token、耗时、TTFO、tokens/s、工具耗时、错误分类和运行状态。
- 外部 OTEL 默认关闭，用户显式配置后才发送；prompt、文件内容、工具完整参数、API Key 和 `runtimeContext` 默认脱敏。
- 支持 `@ai-sdk/otel`、Node tracing channel、Sentry/Langfuse/自定义 OTLP exporter。
- 统一错误类型：配置错误、能力不支持、认证失败、限流、超时、Provider 错误、工具错误、审批拒绝、Sandbox 错误、MCP 错误、恢复失败。
- 支持 total/step/chunk/tool 超时；超时事件可被 UI 区分并允许重试。
- 生命周期回调统一接入 `onStart`、`onStepEnd`、`onEnd`、tool start/finish 和 model call start/end。
- 增加本地诊断页、指标筛选、JSON/CSV 导出和 stream replay；AI SDK DevTools/TUI 作为开发调试入口。

## IPC、路由与设置变更

新增并全部使用 Zod contract → main handler → preload → renderer 顺序：

- `ai.generate`、`ai.abort`、`ai.resume`
- `assets.import/list/read/export/delete`
- `knowledge.sources/index/search/cancel`
- `workflow.list/get/resume/cancel/retry`
- `mcp.servers/upsert/remove/connect/disconnect/test`
- `realtime.open/sendAudio/close`
- `observability.metrics/export/setPolicy`

新增路由：

- `#/knowledge`
- `#/workflows`
- `#/media`
- `#/mcp`
- `#/observability`

Settings 增加：

- Model Capabilities
- Knowledge Indexing
- Media & Assets
- Workflow Recovery
- MCP Permissions
- Telemetry & Privacy
- Sandbox

所有页面沿用现有 BoardUI semantic tokens、AI Elements 和 `SecondaryPageShell`；主工作区仍保持 Agent rail / Chat / Changes 三卡片结构。

## 实施顺序

1. 锁定 AI SDK 7 依赖版本，建立 migration framework、公共类型、StreamEvent v2 和 UIMessage parts。
2. 重构 `agent-core` 为深模块，接入 timeout、fallback、lifecycle、structured output 和可恢复 run。
3. 扩展 Provider Registry 与能力探测，完成文本、推理、工具、结构化输出。
4. 建立资产库和附件链路，完成文件/技能上传、图像、语音、转写、视频、Realtime。
5. 建立 Knowledge package、SQLite 向量存储、索引和引用 UI。
6. 接入 Workflow、Subagents、Harness、Code Mode 和 Sandbox。
7. 接入 MCP Server、权限系统和隔离 App Renderer。
8. 迁移 renderer 到规范化 UIMessage parts，补齐 `useChat`、`useCompletion`、`useObject`、生成式 UI 和恢复流。
9. 完成 Observability、设置页、诊断页、隐私控制和文档同步。
10. 运行完整迁移、回放、集成、安全、性能和 Playwright 验收。

## 测试与验收标准

- 单元测试：Provider capability、模型 fallback、结构化 schema、chunk、cosine、rerank、资产 hash、路径安全、审批 HMAC、超时、脱敏。
- 合约测试：所有新 IPC 入参拒绝未知字段和非法值；所有 StreamEvent 可 `safeParse`；旧消息可迁移到 parts。
- Agent 测试：ToolLoop 多步、stopWhen、reasoning、toolApproval、allow_session、deny 后不重复死磕、子 Agent 摘要、Workflow checkpoint/resume。
- 媒体测试：附件导入、provider reference 缓存、生成资产、导出审批、Realtime 断线重连、视频超时。
- RAG 测试：忽略规则、增量索引、删除来源、向量检索、rerank、引用 metadata。
- MCP/Sandbox 测试：Server 白名单、工具分级审批、iframe CSP、JSON-RPC 隔离、cwd/网络/环境变量限制。
- 安全验收：renderer 无 fs/child_process/明文 Key；路径不可逃逸；日志无 prompt/密钥泄漏；审批 token 输入篡改会失效。
- E2E 验收：发送聊天、停止生成、刷新恢复、附件问答、结构化卡片、工具审批、Workflow 重启恢复、知识库引用、MCP App、图片/音频/视频资产导出。
- 性能验收：流式首 token、长会话裁剪、索引吞吐、资产下载上限、UI 不阻塞、事件序列无丢失或乱序。

## 文档同步

同一改动中更新：

- `design/README.md`：新增 `ai-capabilities`、`knowledge`、`media`、`workflow`、`mcp`、`observability` spec。
- `design/specs/product.md`：删除“向量检索、多 Agent”等未实现限制，改为当前真实能力与云可选边界。
- `architecture.md`：补充新包、资产库、向量存储、Realtime main proxy 和 Sandbox 安全假设。
- `agent-runtime.md`：补充 Workflow、Subagents、Code Mode、Sandbox、UIMessage 和恢复协议。
- `providers.md`：补充能力矩阵、媒体 Provider、Gateway 与 fallback。
- `ipc.md`：补充所有新频道、事件版本和回放规则。
- `ui.md`、`settings.md`、`workspace.md`：补充新增路由、资产导出、Knowledge、MCP App、Telemetry 和实验状态。
- `vercel-ai-sdk-7-feature-matrix.md`：增加“Enjoy Agents 落地状态”列，明确已实现、Provider 依赖、实验能力和有意不采用的 RSC/HTTP/TUI 运行路径。

每份 spec 顶部更新 `最后更新：2026-08-31`，并把新增根因写入“已知坑”。
