# spec/providers

> 协议工厂，不是品牌锁定。最后更新：2026-09-13

## 当前真相

运行时是 Vercel AI SDK 7：官方 OpenAI 走 `createOpenAI`；自定义 `/v1` 与 MiniMax / Kimi / GLM / Qwen 等走 `createOpenAICompatible`（才能解析 `reasoning_content`）。另有 `createAnthropic` / `createDeepSeek` / `createGoogle` / `createGateway` / `openai.responses`。Google 默认官方 Gemini API；Base URL 带 `/openai` 时仍走兼容端点。媒体官方工厂：`@ai-sdk/fal`、`@ai-sdk/replicate`、`@ai-sdk/elevenlabs`、`@ai-sdk/deepgram`、`@ai-sdk/cohere`；视频另加 `@ai-sdk/xai`（`grok-imagine-video*`）。其余品牌仍是 OpenAI 兼容。品牌卡片是 **preset**，填 `kind`、`apiStyle`、`defaultBaseURL`、默认模型目录。

| `apiStyle` | 线协议 | 典型路径 |
|---|---|---|
| `openai` | Chat Completions | `/v1/chat/completions` |
| `anthropic` | Messages | `/v1/messages` |
| `openai-responses` | Responses | `/v1/responses` |

密钥只存在主进程 vault（`safeStorage`）。`ProviderPublic` 给 UI：`hasKey`、`keyHint`（`••••` + 后四位，短 Key / 非可见字符退回纯掩码）、Base URL，**从不回说明文 Key**。`models.list` 只返回 vault 里**已配置档案**的目录；空 vault 返回 `[]`，禁止回退 DeepSeek 预设假装已接通。选择器空态引导去设置页，composer 默认不预填 `deepseek-chat`。

档案是一等公民：智能体只引用，不在智能体页再造一套 CRUD。可绑抽屉下拉只列官方登录 + 已有档案；「添加供应商档案」在菜单外，跳转本页。Configured 行用 `agentRefsForProvider`（`settings.get` 的 `agentTools[]` × `providers[]`）派生「被哪些 CLI 引用」芯片，无引用不画。编辑抽屉只读列出引用。`settings.removeProvider` 先 `unbindProviderFromAgentTools`（清 `providerId` / `useCustomProvider`），仍被引用时 UI 先 Confirm 列出助手名。协议不匹配的档案不会出现在该 CLI 下拉里。

探测：`probeProvider` / `pingProvider` / `discoverRemoteModels`。Fetch `/models` 合并进用户目录后 `rememberProbedModels`；`models.list` 带 `staticCaps` / `probedCaps` / `probedAt`，以及按模型解析的 `contextWindow`。窗口优先级：探测目录字段（`context_window` / `max_model_len` 等）> AI Gateway 公开目录 `GET https://ai-gateway.vercel.sh/v1/models`（启动缓存）> 档案**手填** `contextWindow`。设置页 128k 等只是快捷芯片，默认「自动 / 未知」，未手填不写入档案、不进解析链。SDK 7 的 `LanguageModel` **没有** `contextWindow`，禁止按 modelId 写死 1M/200k 映射表。未探测时 UI 用静态目录（id/label），窗口仍走 Gateway / 手填。都没有则省略 `contextWindow`，UI 显示「窗口未知」。拉模型前先 `adviseCatalogUrl`：按路径认协议。DeepSeek `https://api.deepseek.com/anthropic` 是官方 Messages（cc-switch Claude 预设同款），放行；控制台或 Chat 根 + Anthropic 改写成该路径，不要去打 HTML。`/models` 候选会剥 `/anthropic`，但 `resolvedBaseURL` 不得把档案基址改成 Chat 根。没有 Messages 线的官方主机（如 `api.openai.com`）仍拒。HTML 当 JSON 走 `catalogHtml` 中英文案。

能力：`ProviderCapability`（text/streaming/reasoning/tools/structured/vision/files/skills/image/embedding/rerank/speech/transcription/realtime/video）。静态目录在 `packages/providers/src/capabilities/catalog.ts`；Fal/Replicate/ElevenLabs/Deepgram/Cohere 只声明媒体能力，不能当聊天 LanguageModel。`grok-imagine-*` / dall-e / gpt-image 也只声明 `image`（或 video），不要因为 id 含 `grok` 就加 vision/tools。`createLanguageModel` 会套 `wrapLanguageModel`。`createEnjoyRegistry` 用 SDK `createProviderRegistry`。`createRerankModel` 只给 Cohere / 模型名含 rerank 的档案建 `reranking` 工厂。`createTranslationModel` 走 OpenAI 兼容 `translation()`。`uploadFile` / `uploadSkill` 在 main 调，引用按 hash 缓存。媒体官方 Provider 与语言 Provider 共用设置 UI，不复制一套页面。`resolveModelAlias` 解析 `provider/model`。

推理强度：`ReasoningEffort` + composer Energy Bar，按模型族都要发，禁止因中转就藏思考条。AI SDK 7 顶层 `reasoning` 对 OpenAI-compatible 会映成 `reasoning_effort`。MiniMax-M3 发 `thinking: adaptive`；`reasoning_split` **只给官方 MiniMax 域名**（`api.minimax.io` / `.chat` / `.com`）。中转 `/v1` 发 `reasoning_split` 会 `Unsupported parameter`，思考栏空转后报错。不拆时思考进 `content` 的 `<think>`，UI `absorbTextDelta` 再切开。GLM 发 `thinking.enabled` + `reasoningEffort`。Kimi K3 官方没有 `thinking` 字段，走顶层 `reasoning`。DeepSeek 另走 `usesDeepSeekReasoningApi`。未选档 = 供应商默认，不强制 `disabled`。

设置页交互（Configured / Explore Presets、Dialog 四页签）以 [../references/visual-system.md](../references/visual-system.md) §14 为准；本 spec 只锁协议与密钥边界。Explore 预设分类标题是 **AI SDK 兼容**，不要「Vercel AI SDK」英雄卡，也不要假「Vercel 沙箱」供应商。Gateway 预设是可选云网关，不是沙箱。

## 不变量

- renderer 永不 `readSecret` 明文。编辑对话框提交 Key 只走 `settings.upsertProvider` / `settings.saveSecret`。
- Custom Endpoint（OpenAI `/v1`、Anthropic Messages）必须在 Explore 顶部，不能埋在页底。
- 新增供应商：先加 `packages/providers` preset，再接线；不要在 UI 里手写一套 `createOpenAI`。
- 未知协议 / `kind === "custom"` 的图标用 `RiServerLine` / `RiPlugLine`，不用假品牌标。

## 代码入口

- 工厂与探测：`packages/providers`；拉模型地址判断 `catalog-url.ts`
- 上下文窗口解析：`packages/providers/src/context-window.ts`、`gateway-catalog.ts`；`models.list` 在 `secrets.ts` 的 `listAllPublicModels` 注入
- 空 vault 目录：`apps/desktop/src/main/services/listed-models.ts`
- vault：`apps/desktop/src/main/services/secrets-vault.ts`（加解密 / 迁移）；档案 CRUD：`secrets.ts`（删除时解绑 CLI）
- 设置 UI：`apps/desktop/src/renderer/src/components/settings/providers/`
- 合约：`packages/ipc-contract` 的 `UpsertProviderInput` / `ProviderPublic`；CLI 兼容与引用派生 `provider-agent-bind.ts`

## 已知坑

- **隐患**：列表直接渲染 IPC `keyHint`（`••••`+后四位）。正确做法：列表走 i18n「密钥已保存」；`keyHint` 只给编辑框 placeholder。
- 空 vault 曾在 `listAllPublicModels` 硬塞 DeepSeek 静态目录（`providerId: "default"`）。设置页「已配置 0」但选择器仍显示 4 个模型。目录必须跟档案走，空档案返回 `[]`。
- 自定义 `/v1` 上 MiniMax / GLM / Kimi 报 `No output generated`：不是这些模型不思考，也不是该藏思考档。官方 `createOpenAI` 会丢掉 `reasoning_content`，必须 `createOpenAICompatible`。MiniMax-M3 要 `thinking`；`reasoning_split` 只给官方域名。GLM 要 `thinking` + `reasoning_effort`；Kimi K3 走顶层 `reasoning`。不要把 `reasoning: xhigh` 一刀切发给 MiniMax。
- 中转 MiniMax 报 `Unsupported parameter(s): 'reasoning_split'`：这是 MiniMax 官方拆思考字段，严格 OpenAI 网关会拒。思考栏空转「本轮没有推理轨迹」是请求已失败、没有 token。中转只发 `thinking.adaptive`。
- 添加 Anthropic 时把 Base URL 填成 `https://platform.deepseek.com`，点「拉取」会打到控制台网页。那是控制台不是接口。正确做法：识别已知控制台 / 官方主机；DeepSeek 官方 Messages 在 `https://api.deepseek.com/anthropic`（Chat Completions 才是 `/v1`），控制台或 Chat 根 + Anthropic 改写成 `/anthropic`，不要按主机名拒。`api.openai.com` 没有 Messages 线才拒。拉 `/models` 要剥 `/anthropic` 打根上的目录，但禁止把档案 Base URL 覆盖成 Chat 根（否则 Claude 的 `ANTHROPIC_BASE_URL` 会坏）。
- DeepSeek 双入口：Chat / Codex 走 `https://api.deepseek.com/v1`；Claude 走 `https://api.deepseek.com/anthropic`。不是独立 SDK，也不要抄 cc-switch 的本机协议代理。
- 国内中转只改 `baseURL` + 透传模型 ID。preset 不是唯一合法供应商。
- 上下文窗口：不要写 `MODEL_CONTEXT_LIMITS["grok-4.6"]=1M`。官方 `/models` 常不带 `context_window`，此时靠 Gateway 目录或用户明确手填的档案窗口；都没有就显示「窗口未知」，不要猜 128k / 200k / 1M。旧档案若曾被表单默认写成 128000，用户需在参数页点「自动 / 未知」并保存才能清掉。
- 删除仍被 CLI 引用的档案必须先解绑（`unbindProviderFromAgentTools`），否则智能体卡还显示已删档案名，开流会找不到 Key。UI 先列出助手名再 Confirm。
- 不要把 `kind===custom` 当成「什么协议都能绑」。Claude 只收 anthropic；Codex 不收 google/anthropic；Gemini 只收 `kind===google`（即使 apiStyle 是 openai）。
- 绑定下拉里「+ 添加 {品牌} 供应商」既像选项又像入口，还会在智能体抽屉就地 CRUD。正确做法：下拉只列官方登录 + 已有档案；「添加供应商档案」在菜单外跳转本页。仅官方槽不要画这条链。
- Explore 若再写「Vercel AI SDK」英雄卡或「Vercel 沙箱」供应商，C 端会把运行时实现当成要买的云产品。分类用「AI SDK 兼容」；Gateway 只是可选网关，不是沙箱。
- Ollama 等 `requiresKey === false` 的探测可塞占位 key，避免 SDK 因空 key 直接拒绝。
- Fal / Replicate / ElevenLabs / Deepgram / Cohere 没有 OpenAI `/models`。`probeProvider` 只校验 Key 已填，真正建连发生在 generate。把它们设成当前聊天 Provider 会抛「media provider」而不是假装能对话。
- xAI 官方生图是 `@ai-sdk/xai` 的 `xai.image('grok-imagine-image-2.0')` + `generateImage`。本仓尚未单独装 xAI preset；挂在 OpenAI `/v1` 兼容端点时走 `createOpenAI().image()`，对准 `images/generations`。不要用 `streamText` 调 imagine 模型。
- xAI 视频必须 `createXai().video('grok-imagine-video')` + `experimental_generateVideo`。不要用 `image()` 冒充。档案即使 kind=openai，只要模型 id 是 imagine-video 也走这条。Base URL 跟生图同一主机；只有空或 `api.openai.com` 才改打 `https://api.x.ai/v1`。国内中转能出图却强行打官方 x.ai 会 Connect Timeout。
