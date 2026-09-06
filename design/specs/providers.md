# spec/providers

> 协议工厂，不是品牌锁定。最后更新：2026-09-06

## 当前真相

运行时是 Vercel AI SDK 7：语言走 `createOpenAI` / `createAnthropic` / `createDeepSeek` / `createGoogle` / `createGateway` / `openai.responses`。Google 默认官方 Gemini API；Base URL 带 `/openai` 时仍走兼容端点。媒体官方工厂：`@ai-sdk/fal`、`@ai-sdk/replicate`、`@ai-sdk/elevenlabs`、`@ai-sdk/deepgram`、`@ai-sdk/cohere`；视频另加 `@ai-sdk/xai`（`grok-imagine-video*`）。其余品牌仍是 OpenAI 兼容。品牌卡片是 **preset**，填 `kind`、`apiStyle`、`defaultBaseURL`、默认模型目录。

| `apiStyle` | 线协议 | 典型路径 |
|---|---|---|
| `openai` | Chat Completions | `/v1/chat/completions` |
| `anthropic` | Messages | `/v1/messages` |
| `openai-responses` | Responses | `/v1/responses` |

密钥只存在主进程 vault（`safeStorage`）。`ProviderPublic` 给 UI：`hasKey`、`keyHint`（`••••` + 后四位）、Base URL，**从不回说明文 Key**。`models.list` 只返回 vault 里**已配置档案**的目录；空 vault 返回 `[]`，禁止回退 DeepSeek 预设假装已接通。选择器空态引导去设置页，composer 默认不预填 `deepseek-chat`。

探测：`probeProvider` / `pingProvider` / `discoverRemoteModels`。Fetch `/models` 合并进用户目录后 `rememberProbedModels`；`models.list` 带 `staticCaps` / `probedCaps` / `probedAt`，以及按模型解析的 `contextWindow`。窗口优先级：探测目录字段（`context_window` / `max_model_len` 等）> AI Gateway 公开目录 `GET https://ai-gateway.vercel.sh/v1/models`（启动缓存）> 档案**手填** `contextWindow`。设置页 128k 等只是快捷芯片，默认「自动 / 未知」，未手填不写入档案、不进解析链。SDK 7 的 `LanguageModel` **没有** `contextWindow`，禁止按 modelId 写死 1M/200k 映射表。未探测时 UI 用静态目录（id/label），窗口仍走 Gateway / 手填。都没有则省略 `contextWindow`，UI 显示「窗口未知」。HTML 当 JSON 要报成可读端点错误。

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
- 上下文窗口解析：`packages/providers/src/context-window.ts`、`gateway-catalog.ts`；`models.list` 在 `secrets.ts` 的 `listAllPublicModels` 注入
- 空 vault 目录：`apps/desktop/src/main/services/listed-models.ts`
- vault：`apps/desktop/src/main/services/secrets-vault.ts`（加解密 / 迁移）；档案 CRUD：`secrets.ts`
- 设置 UI：`apps/desktop/src/renderer/src/components/settings/providers/`
- 合约：`packages/ipc-contract` 的 `UpsertProviderInput` / `ProviderPublic`

## 已知坑

- 空 vault 曾在 `listAllPublicModels` 硬塞 DeepSeek 静态目录（`providerId: "default"`）。设置页「已配置 0」但选择器仍显示 4 个模型。目录必须跟档案走，空档案返回 `[]`。
- DeepSeek 走 OpenAI 兼容端点（`https://api.deepseek.com/v1`），不是独立 SDK。
- 国内中转只改 `baseURL` + 透传模型 ID。preset 不是唯一合法供应商。
- 上下文窗口：不要写 `MODEL_CONTEXT_LIMITS["grok-4.6"]=1M`。官方 `/models` 常不带 `context_window`，此时靠 Gateway 目录或用户明确手填的档案窗口；都没有就显示「窗口未知」，不要猜 128k / 200k / 1M。旧档案若曾被表单默认写成 128000，用户需在参数页点「自动 / 未知」并保存才能清掉。
- Ollama 等 `requiresKey === false` 的探测可塞占位 key，避免 SDK 因空 key 直接拒绝。
- Fal / Replicate / ElevenLabs / Deepgram / Cohere 没有 OpenAI `/models`。`probeProvider` 只校验 Key 已填，真正建连发生在 generate。把它们设成当前聊天 Provider 会抛「media provider」而不是假装能对话。
- xAI 官方生图是 `@ai-sdk/xai` 的 `xai.image('grok-imagine-image-2.0')` + `generateImage`。本仓尚未单独装 xAI preset；挂在 OpenAI `/v1` 兼容端点时走 `createOpenAI().image()`，对准 `images/generations`。不要用 `streamText` 调 imagine 模型。
- xAI 视频必须 `createXai().video('grok-imagine-video')` + `experimental_generateVideo`。不要用 `image()` 冒充。档案即使 kind=openai，只要模型 id 是 imagine-video 也走这条。Base URL 跟生图同一主机；只有空或 `api.openai.com` 才改打 `https://api.x.ai/v1`。国内中转能出图却强行打官方 x.ai 会 Connect Timeout。
