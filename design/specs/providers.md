# spec/providers

> 协议工厂，不是品牌锁定。最后更新：2026-09-01

## 当前真相

运行时是 Vercel AI SDK 7：语言走 `createOpenAI` / `createAnthropic` / `createDeepSeek` / `createGoogle` / `createGateway` / `openai.responses`。Google 默认官方 Gemini API；Base URL 带 `/openai` 时仍走兼容端点。媒体官方工厂：`@ai-sdk/fal`、`@ai-sdk/replicate`、`@ai-sdk/elevenlabs`、`@ai-sdk/deepgram`、`@ai-sdk/cohere`。其余品牌仍是 OpenAI 兼容。品牌卡片是 **preset**，填 `kind`、`apiStyle`、`defaultBaseURL`、默认模型目录。

| `apiStyle` | 线协议 | 典型路径 |
|---|---|---|
| `openai` | Chat Completions | `/v1/chat/completions` |
| `anthropic` | Messages | `/v1/messages` |
| `openai-responses` | Responses | `/v1/responses` |

密钥只存在主进程 vault（`safeStorage`）。`ProviderPublic` 给 UI：`hasKey`、`keyHint`（`••••` + 后四位）、Base URL，**从不回说明文 Key**。

探测：`probeProvider` / `pingProvider` / `discoverRemoteModels`。Fetch `/models` 合并进用户目录后 `rememberProbedModels`；`models.list` 带 `staticCaps` / `probedCaps` / `probedAt`。未探测时 UI 用静态目录。HTML 当 JSON 要报成可读端点错误。

能力：`ProviderCapability`（text/streaming/reasoning/tools/structured/vision/files/skills/image/embedding/rerank/speech/transcription/realtime/video）。静态目录在 `packages/providers/src/capabilities/catalog.ts`；Fal/Replicate/ElevenLabs/Deepgram/Cohere 只声明媒体能力，不能当聊天 LanguageModel。`grok-imagine-*` / dall-e / gpt-image 也只声明 `image`（或 video），不要因为 id 含 `grok` 就加 vision/tools。`createLanguageModel` 会套 `wrapLanguageModel`。`createEnjoyRegistry` 用 SDK `createProviderRegistry`。`createRerankModel` 只给 Cohere / 模型名含 rerank 的档案建 `reranking` 工厂。`createTranslationModel` 走 OpenAI 兼容 `translation()`。`uploadFile` / `uploadSkill` 在 main 调，引用按 hash 缓存。媒体官方 Provider 与语言 Provider 共用设置 UI，不复制一套页面。`resolveModelAlias` 解析 `provider/model`。

推理强度：`ReasoningEffort` + composer 上的 Energy Bar。主进程按模型 ID 决定是否走 DeepSeek reasoning API（`usesDeepSeekReasoningApi`）。

设置页交互（Configured / Explore Presets、Dialog 四页签）以 [../references/visual-system.md](../references/visual-system.md) §14 为准；本 spec 只锁协议与密钥边界。

## 不变量

- renderer 永不 `readSecret` 明文。编辑对话框提交 Key 只走 `settings.upsertProvider` / `settings.saveSecret`。
- Custom Endpoint（OpenAI `/v1`、Anthropic Messages）必须在 Explore 顶部，不能埋在页底。
- 新增供应商：先加 `packages/providers` preset，再接线；不要在 UI 里手写一套 `createOpenAI`。
- 未知协议 / `kind === "custom"` 的图标用 `RiServerLine` / `RiPlugLine`，不用假品牌标。

## 代码入口

- 工厂与探测：`packages/providers`
- vault：`apps/desktop/src/main/services/secrets-vault.ts`（加解密 / 迁移）；档案 CRUD：`secrets.ts`
- 设置 UI：`apps/desktop/src/renderer/src/components/settings/providers/`
- 合约：`packages/ipc-contract` 的 `UpsertProviderInput` / `ProviderPublic`

## 已知坑

- DeepSeek 走 OpenAI 兼容端点（`https://api.deepseek.com/v1`），不是独立 SDK。
- 国内中转只改 `baseURL` + 透传模型 ID。preset 不是唯一合法供应商。
- Ollama 等 `requiresKey === false` 的探测可塞占位 key，避免 SDK 因空 key 直接拒绝。
- Fal / Replicate / ElevenLabs / Deepgram / Cohere 没有 OpenAI `/models`。`probeProvider` 只校验 Key 已填，真正建连发生在 generate。把它们设成当前聊天 Provider 会抛「media provider」而不是假装能对话。
- xAI 官方生图是 `@ai-sdk/xai` 的 `xai.image('grok-imagine-image-2.0')` + `generateImage`。本仓尚未单独装 xAI preset；挂在 OpenAI `/v1` 兼容端点时走 `createOpenAI().image()`，对准 `images/generations`。不要用 `streamText` 调 imagine 模型。
