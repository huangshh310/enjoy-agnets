# spec/providers

> 协议工厂，不是品牌锁定。最后更新：2026-10-10（删档案禁止 allowInsecure / 生产明文；最后一把 clearVault，否则 KEYCHAIN_UNAVAILABLE）

## 当前真相

运行时是 Vercel AI SDK 7：官方 OpenAI 走 `createOpenAI`；自定义 `/v1` 与国产主流（豆包 Doubao、百度千帆 Wenxin、腾讯混元 Hunyuan、阶跃星辰 Stepfun、零一万物 ZeroOne、百川智能 Baichuan、讯飞星火 Spark、通义千问 Qwen、智谱 GLM、MiniMax、月之暗面 Kimi、硅基流动 SiliconFlow）及国际主流（xAI Grok、Mistral AI、Together AI、Perplexity、Groq、OpenRouter 等）均走 `createOpenAICompatible`（完整支持流式、函数调用与 `reasoning_content` 推理轨迹）。另有 `createAnthropic` / `createDeepSeek` / `createGoogle` / `createGateway` / `openai.responses`。Google 默认官方 Gemini API；Base URL 带 `/openai` 时仍走兼容端点。媒体官方工厂：`@ai-sdk/fal`、`@ai-sdk/replicate`、`@ai-sdk/elevenlabs`、`@ai-sdk/deepgram`、`@ai-sdk/cohere`；视频另加 `@ai-sdk/xai`（`grok-imagine-video*`）。品牌卡片是 **preset**，填 `kind`、`apiStyle`、`defaultBaseURL`、默认模型目录。

| `apiStyle` | 线协议 | 典型路径 |
|---|---|---|
| `openai` | Chat Completions | `/v1/chat/completions` |
| `anthropic` | Messages | `/v1/messages` |
| `openai-responses` | Responses | `/v1/responses` |

一张档案可以同时有 Chat、Responses、Anthropic 三条端点（`endpoints`），多把 Key（`keys[]`），以及 `baseAPI`（编辑器主 URL 展示哪一条）。请求以端点里实际有值为准，**不是协议互译**。`apiKey` / `baseURL` / `apiStyle` 每次保存重算：`apiKey` 是第一把启用且未锁协议的 Key，否则第一把对 `baseAPI` 启用的 Key；`baseURL` 是 `endpoints[baseAPI]`，空则第一条有值的端点；`apiStyle` 等于 `baseAPI`。派生字段只给旧调用点和列表展示。Google 官方主机仍走 `createGoogle`，不改成 OpenAI 兼容根。

`enabled` 是关闭但保留。关掉的档案不进选择器、不进 CLI 绑定。`activeId` 仍是新会话 Enjoy Local 的默认档案，和 `enabled` 是两件事。关掉当前默认档案时，`activeId` 改到下一张仍开启的档案。设置页「当前」只显示仍开启的默认档案；一张都没开就写「未在使用」，不把已关闭的名字当成当前。关掉的行主按钮是「开启」。页头模型数是收录，含已关闭档案，文案不是「此刻可选」。复制档案在主进程完成，Key 不进 renderer。

密钥只存在主进程 vault（`safeStorage`）。钥匙串不可用时 `settings.upsertProvider` / `saveSecret` 回 `{ ok:false, code:"KEYCHAIN_UNAVAILABLE" }`，不要 throw；Linux `basic_text` 当不可用，**禁止明文回落**，没有 `allowInsecure`。`e2e-plain:` 只在 stub+未打包+隔离 userData 写；读侧也只在 stub 认这个前缀。删档案时若还有别的带密钥档案且钥匙串挂了：拒绝，vault 原密文不动；若是最后一把带密钥的：`clearVault` 整行清掉，不重加密。`ProviderPublic.keys` 只给 `{ id, name, hasKey, keyHint, apiStyle, enabled }`。列表文案是「密钥已保存」；`keyHint` 只做编辑框 placeholder。`customHeaders` / `customBody` 只回键的占位 JSON，空值保存保留已存。`models.list` 只列出**开启档案**上 `enabled !== false` 的模型；空 vault 返回 `[]`，禁止回退 DeepSeek 预设假装已接通。选择器左栏副文案是端点缩写（Chat · Responses · Messages）。composer 默认不预填 `deepseek-chat`。

旧档案没有 `endpoints` 时，`readVault` 做一次迁移：`endpoints[apiStyle] = baseURL`；URL 等于该预设同一区域的官方地址时才补兄弟端点，改过的中转地址不补。已保存的 MiniMax / 智谱 / 豆包 URL 不改去套餐主机。读档失败不当成空 vault 覆盖。

目录 URL：`modelsURL` 优先，否则 Chat，再 Responses，再把 Anthropic 根去掉 `/anthropic`。`resolvedBaseURL` 禁止把档案里的 Anthropic 根改写成 Chat 根。拉取只追加远程新增（`source: "remote"`、`enabled: true`），不打开用户关掉的，不删远程消失的，不改手填。窗口：行上 `contextWindow`，否则档案手填，再 Gateway，再 `publishedContextWindow`。

`settings.detectProvider` 对三条协议各发一次最小 POST，10 秒超时。成功必须是 JSON 且不是 HTML。编辑器把成功的根写入对应端点；用户改过且不同的保留，并提示「检测结果与当前不同」。不自动保存。失败文案是 i18n code。

Enjoy Local 多 Key 只在**还没有任何 token** 时，对 401 / 403 / 408 / 429 / 529 / 5xx 按顺序换下一把匹配且启用的 Key。已经吐过 token 就停。CLI 进程不换 Key。

代理：空跟随系统；`direct` 去掉这次 `fetch` 和该 CLI 子进程的 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`（及小写）；其它必须是 `http:` / `https:`。没有 SOCKS 依赖，`socks5` 拒绝。没装 undici 时 URL 代理失败；`direct` 退回全局 fetch，Chromium 系统代理仍可能生效。Windows / macOS / Linux 同一套，不读本机代理软件的私有配置。

`reasoningFamily: "auto"` 跟 `kind`；`custom` 再看模型 id 前缀（`minimax` / `glm` / `kimi` / `deepseek` / `moonshot`）。显式家族覆盖 kind。中转即使模型名带 deepseek，也不进 `@ai-sdk/deepseek`。

COST-P3 单价：`packages/providers/src/pricing/` 内置 models.dev 离线快照（`version` / `date` / 可选 `sourceEtag` / `sourceSha256`，每百万 token USD：输入/输出/缓存读/缓存写/推理；可选 `tierContext` 为分档最低上下文阈值）。匹配是 **单一官方按量 catalog + modelId 精确命中**。有国内/国际两份价或按量/套餐两套主机的映射先撤，不按 region 猜 catalog：`alibaba`/`alibaba-cn`→qwen、`moonshotai`/`moonshotai-cn`→kimi、`volcengine`→doubao、`zhipuai`→zhipu 都不收录。快照只收能确定是单一官方按量、且与 preset 同站的目录：openai / anthropic / google / deepseek / groq / mistral / xai / perplexity / togetherai→together，以及单端点中转 openrouter / siliconflow-cn→siliconflow / modelscope / aihubmix。媒体-only kind（`cohere` / fal / replicate / elevenlabs / deepgram）显式排除，不靠 custom 兜底 + 空 baseURL 当成官方端点。models.dev 国际站 `siliconflow`（`.com`）与本仓国内 preset（`.cn`）不是同一站点，不收录。有多区域或套餐的 kind（qwen / kimi / doubao / zhipu / zai / wenxin / stepfun / xiaomi / minimax）官方端点没用户价 → `unknown`（显示「—」），用户自填 `*PricePerMillion` 仍估算。套餐端点（qwen `token-plan`、kimi `code-*` 等）没有用户价一律 unknown。带区域的定价以后另开一刀。别名只留一对一且真实存在、价目相同的 dated id；家族名 / 一对多丢掉。不含 `gateway`。`userRates` 与 `snapshotVersion` 首次写入 `usage_json` 后固定；会话重算仍用当前内置快照，`snapshotVersion` 只做落档标记、不拿来换旧价。baseURL 不是官方按量地址、又没填用户单价 → `unknown`。分档看单步 `maxStepInputTokens`（来自 `finish-step`），不是泵的 totalUsage 合计。任一单步 input 超过该模型 `tierContext`，或模型有分档但拿不到单步值，或 `stepInputIncomplete`（部分步骤没报 input）→ 整次 `unknown`，`missing: ["tier"]`，不得标 `estimated`。计费金额仍用合计 token。没有 token 字段的空 `usage_json` 按 unknown，明确写了 0 token 才跳过。Ollama / LM Studio 是「本地 · 不计费」。主路径估价不联网；刷新快照用 `packages/providers/scripts/refresh-price-snapshot.ts`（可加 `--expect-sha=`）。有缓存 token 但缺缓存单价 → 整次 `unknown`；推理缺独立单价仍按 output 计，不算未知。

档案是一等公民：智能体只引用，不在智能体页再造一套 CRUD。可绑抽屉下拉只列官方登录 + 已有档案；「添加供应商档案」在菜单外，跳转本页。Configured 行用 `agentRefsForProvider`（`settings.get` 的 `agentTools[]` × `providers[]`）派生「被哪些 CLI 引用」芯片，无引用不画。编辑抽屉只读列出引用。`settings.removeProvider` 先 `unbindProviderFromAgentTools`（清 `providerId` / `useCustomProvider`），仍被引用时 UI 先 Confirm 列出助手名。协议不匹配的档案不会出现在该 CLI 下拉里。

探测：`probeProvider` / `pingProvider` / `discoverRemoteModels`。Fetch `/models` 合并进用户目录后 `rememberProbedModels`；`models.list` 带 `staticCaps` / `probedCaps` / `probedAt`，以及按模型解析的 `contextWindow`。窗口优先级：探测目录字段（`context_window` / `max_model_len` 等）> AI Gateway 公开目录 `GET https://ai-gateway.vercel.sh/v1/models`（启动缓存）> 档案**手填** `contextWindow`。设置页 128k 等只是快捷芯片，默认「自动 / 未知」，未手填不写入档案、不进解析链。SDK 7 的 `LanguageModel` **没有** `contextWindow`，禁止在 `models.list` 里按 modelId 写死窗口。未探测时 UI 用静态目录（id/label），窗口仍走 Gateway / 手填。都没有则省略 `contextWindow`；检查器再落到 `publishedContextWindow`（价目表写明的家族），其余仍显示「窗口未知」。拉模型前先 `adviseCatalogUrl`：按路径认协议。DeepSeek `https://api.deepseek.com/anthropic` 是官方 Messages（cc-switch Claude 预设同款），放行；控制台或 Chat 根 + Anthropic 改写成该路径，不要去打 HTML。`/models` 候选会剥 `/anthropic`，但 `resolvedBaseURL` 不得把档案基址改成 Chat 根。没有 Messages 线的官方主机（如 `api.openai.com`）仍拒。HTML 当 JSON 走 `catalogHtml` 中英文案。

能力：`ProviderCapability`（text/streaming/reasoning/tools/structured/vision/files/skills/image/embedding/rerank/speech/transcription/realtime/video）。静态目录在 `packages/providers/src/capabilities/catalog.ts`；Fal/Replicate/ElevenLabs/Deepgram/Cohere 只声明媒体能力，不能当聊天 LanguageModel。`grok-imagine-*` / dall-e / gpt-image 也只声明 `image`（或 video），不要因为 id 含 `grok` 就加 vision/tools。`createLanguageModel` 会套 `wrapLanguageModel`。`createEnjoyRegistry` 用 SDK `createProviderRegistry`。`createRerankModel` 只给 Cohere / 模型名含 rerank 的档案建 `reranking` 工厂。`createTranslationModel` 走 OpenAI 兼容 `translation()`。`uploadFile` / `uploadSkill` 在 main 调，引用按 hash 缓存。媒体官方 Provider 与语言 Provider 共用设置 UI，不复制一套页面。`resolveModelAlias` 解析 `provider/model`。

推理强度：`ReasoningEffort` + composer Energy Bar，按模型族都要发，禁止因中转就藏思考条。AI SDK 7 顶层 `reasoning` 对 OpenAI-compatible 会映成 `reasoning_effort`。MiniMax-M3 发 `thinking: adaptive`；`reasoning_split` **只给官方 MiniMax 域名**（`api.minimax.io`、`api.minimax.chat`、`api.minimax.com`、`api.minimaxi.com`）。中转主机只发 `thinking`，不要放宽。中转 `/v1` 发 `reasoning_split` 会 `Unsupported parameter`，思考栏空转后报错。不拆时思考进 `content` 的 `<think>`，UI `absorbTextDelta` 再切开。GLM 发 `thinking.enabled` + `reasoningEffort`。Kimi K3 官方没有 `thinking` 字段，走顶层 `reasoning`。DeepSeek 另走 `usesDeepSeekReasoningApi`。未选档 = 供应商默认，不强制 `disabled`。

设置页交互（Configured / Explore Presets、Dialog 四页签）以 [../references/visual-system.md](../references/visual-system.md) §14 为准；本 spec 只锁协议与密钥边界。Explore 预设分类标题是 **AI SDK 兼容**，不要「Vercel AI SDK」英雄卡，也不要假「Vercel 沙箱」供应商。Gateway 预设是可选云网关，不是沙箱。

## 不变量

- renderer 永不 `readSecret` 明文。编辑对话框提交 Key 只走 `settings.upsertProvider` / `settings.saveSecret`。
- 自定义端点只有一扇门：Explore 顶部横幅「添加自定义端点」，已配置空态同一条。页头不再放「+ 自定义 /v1」，横幅不再拆成 Anthropic / OpenAI 两颗按钮。协议在抽屉里用主 API 选。不能埋在页底。
- 新增供应商：先加 `packages/providers` preset，再接线；不要在 UI 里手写一套 `createOpenAI`。
- 未知协议 / `kind === "custom"` 的图标用 `RiServerLine` / `RiPlugLine`，不用假品牌标。

## 代码入口

- 工厂与探测：`packages/providers`；拉模型地址判断 `catalog-url.ts`
- 上下文窗口解析：`packages/providers/src/context-window.ts`、`gateway-catalog.ts`；`models.list` 在 `secrets.ts` 的 `listAllPublicModels` 注入
- 空 vault 目录：`apps/desktop/src/main/services/listed-models.ts`
- vault：`apps/desktop/src/main/services/secrets-vault.ts`（加解密 / 迁移）；档案 CRUD：`secrets.ts`（删除时解绑 CLI）
- 设置 UI：`apps/desktop/src/renderer/src/components/settings/providers/`
- 合约：`packages/ipc-contract` 的 `UpsertProviderInput` / `ProviderPublic`；CLI 兼容与引用派生 `provider-agent-bind.ts`
- 单价与估算：`packages/providers/src/pricing/`（子路径 `@enjoy-agents/providers/pricing`，只给 main；根入口不导出，renderer 不要别名这份快照）
- 快照重建：`packages/providers/scripts/refresh-price-snapshot.ts`

## 已知坑

- **隐患**：`removeProfile` 曾 `writeVault(..., { allowInsecure: true })`。`encryptString` 抛错时 `encryptJson` 把整包写成 `e2e-plain:`+JSON，没有 stub 闸，生产也会中招；读侧只在 stub 认该前缀，钥匙串恢复后 `readVault` 得到 `[]`，另一把密钥以明文躺在 DB。正确做法：去掉 `allowInsecure`；生产永不写明文；多把时拒绝并回 `KEYCHAIN_UNAVAILABLE`；最后一把 `clearVault`。行为测必须真读写，不要只扫源码正则。
- **隐患**：`settings.upsertProvider` 在无系统钥匙串时抛英文，renderer `void save()` 吞掉后抽屉既不关也不报错。正确做法：renderer `runSecretWrite` 先检 `ok` 再接 throw；① `secretStorageAvailable === false` 黄条+禁保存（输入不锁）；② `KEYCHAIN_UNAVAILABLE` 保存钮上方红字（不提重启）；其它「没存上，请再试一次」；草稿留下。不要在本包定义 `SecretWriteErrorCode` 枚举（#133 ipc-contract）。
- **隐患**：列表直接渲染 IPC `keyHint`（`••••`+后四位）。正确做法：列表走 i18n「密钥已保存」；`keyHint` 只给编辑框 placeholder。
- **隐患**：`customHeaders` / `customBody` 曾随 `ProviderPublic` 全文回 renderer。正确做法：只回键的占位 JSON；保存时空值保留已存，与 apiKey 空则保留同一套。
- 空 vault 曾在 `listAllPublicModels` 硬塞 DeepSeek 静态目录（`providerId: "default"`）。设置页「已配置 0」但选择器仍显示 4 个模型。目录必须跟档案走，空档案返回 `[]`。
- 自定义 `/v1` 上 MiniMax / GLM / Kimi 报 `No output generated`：不是这些模型不思考，也不是该藏思考档。官方 `createOpenAI` 会丢掉 `reasoning_content`，必须 `createOpenAICompatible`。MiniMax-M3 要 `thinking`；`reasoning_split` 只给官方域名。GLM 要 `thinking` + `reasoning_effort`；Kimi K3 走顶层 `reasoning`。不要把 `reasoning: xhigh` 一刀切发给 MiniMax。
- 中转 MiniMax 报 `Unsupported parameter(s): 'reasoning_split'`：这是 MiniMax 官方拆思考字段，严格 OpenAI 网关会拒。思考栏空转「本轮没有推理轨迹」是请求已失败、没有 token。中转只发 `thinking.adaptive`。
- 添加 Anthropic 时把 Base URL 填成 `https://platform.deepseek.com`，点「拉取」会打到控制台网页。那是控制台不是接口。正确做法：识别已知控制台 / 官方主机；DeepSeek 官方 Messages 在 `https://api.deepseek.com/anthropic`（Chat Completions 才是 `/v1`），控制台或 Chat 根 + Anthropic 改写成 `/anthropic`，不要按主机名拒。`api.openai.com` 没有 Messages 线才拒。拉 `/models` 要剥 `/anthropic` 打根上的目录，但禁止把档案 Base URL 覆盖成 Chat 根（否则 Claude 的 `ANTHROPIC_BASE_URL` 会坏）。
- DeepSeek 双入口：Chat / Codex 走 `https://api.deepseek.com/v1`；Claude 走 `https://api.deepseek.com/anthropic`。不是独立 SDK，也不要抄 cc-switch 的本机协议代理。
- 国内中转只改 `baseURL` + 透传模型 ID。preset 不是唯一合法供应商。
- 拉模型目录的 URL 优先 Chat，再 Responses。`baseAPI` 是 Anthropic 且 Chat 有值时，`/models` 仍走 OpenAI 目录格式。不要按 `baseAPI` 去打 Anthropic Messages 目录。只有没落到 Chat / Responses 根上时才用 Anthropic 目录。
- 上下文窗口：不要写一张覆盖全部 id 的 `MODEL_CONTEXT_LIMITS`。官方 `/models` 常不带 `context_window`，优先 Gateway 目录或用户手填。都没有时，UI 只用 `publishedContextWindow` 里厂商价目表写明的家族（Claude 200k、grok-4.6 为 2M、`deepseek-flash` / V4 为 1M）。Gateway 没有 `deepseek/deepseek-flash` 这一行，短 id 要对到 `deepseek-v4.1-flash`。价目表没写的 id 仍显示「窗口未知」，不要猜 128k。旧档案若曾被表单默认写成 128000，用户需在参数页点「自动 / 未知」并保存才能清掉。
- 删除仍被 CLI 引用的档案必须先解绑（`unbindProviderFromAgentTools`），否则智能体卡还显示已删档案名，开流会找不到 Key。UI 先列出助手名再 Confirm。
- 不要把 `kind===custom` 当成「什么协议都能绑」。有 `endpoints` 时按非空 URL 判断：Claude 只收 `endpoints.anthropic`；Codex 收 `openai-responses` 或 `openai`，`kind === "google"` 仍拒绝；Gemini 仍只收 `kind === "google"`；DeepSeek CLI 用 Chat，没有则用派生 `baseURL`。没有 `endpoints` 的旧对象仍按 `apiStyle` / `kind`。官方 DeepSeek URL 会补上 Anthropic，从而出现在 Claude 绑定里；URL 改过的中转不会。Claude 行显示端点主机，方便认出「官方 URL + 只开通 Chat 的 Key」。
- 关闭不等于删除。配置还在，选择器和 CLI 绑定里消失；再打开就恢复。派生 `baseURL` 不是第二条协议。
- SOCKS 代理不可用。不要为 `socks5` 加一套未接线的代理栈。没装 undici 时，自定义 http(s) 代理会失败；`direct` 退回全局 fetch，系统代理仍可能作用在 Chromium 上。
- 绑定下拉里「+ 添加 {品牌} 供应商」既像选项又像入口，还会在智能体抽屉就地 CRUD。正确做法：下拉只列官方登录 + 已有档案；「添加供应商档案」在菜单外跳转本页。仅官方槽不要画这条链。
- 页头「+ 自定义 /v1」再加横幅上的 Anthropic / OpenAI 两颗按钮，是旧的单协议入口。一条档案已经能装三条线。正确做法：Explore 顶部只留一颗「添加自定义端点」，协议在抽屉的主 API 里选。预设卡和已配置行的协议芯片用 Chat / Responses / Messages，单独换行，不要把「OpenAI /v1」挤成「Respons…」。
- 关掉的档案仍是默认档案时，行上不要同时画「使用中」和「已关闭」。页头「当前」必须再看 `enabled`，只认 `active` 会把已关闭档案写成当前。关掉的行主按钮是「开启」，不要留一颗灰掉的「使用」，也不要把整行 `opacity` 盖住这颗按钮。模型数是收录口径，关掉也计入，文案不要写成此刻能选的数量。
- 预设说明如果直接渲染 `preset.description`，中文设置页会整段英文。卡片和抽屉副文案走 `settings.providers.blurb.<kind>`，缺键才退回原文。新建自定义档案的显示名用当前语言的「自定义端点」，不要用预设里的 Custom endpoint。已保存的名字不改。覆盖页请求头图标用钥匙，不要用花括号，空态已经是「还没有请求头」。参数页 1M 芯片用 `ctx1m`。
- 模型页思考能量若直接读 `EFFORT_LEVELS` 的英文字面量，会和参数页的中文档名不一致。两页都走 `getEffortMeta(value, t)` / `getEffortLevels(t)`。
- Explore 若再写「Vercel AI SDK」英雄卡或「Vercel 沙箱」供应商，C 端会把运行时实现当成要买的云产品。分类用「AI SDK 兼容」；Gateway 只是可选网关，不是沙箱。
- Ollama 等 `requiresKey === false` 的探测可塞占位 key，避免 SDK 因空 key 直接拒绝。
- Fal / Replicate / ElevenLabs / Deepgram / Cohere 没有 OpenAI `/models`。`probeProvider` 只校验 Key 已填，真正建连发生在 generate。把它们设成当前聊天 Provider 会抛「media provider」而不是假装能对话。
- xAI 官方生图是 `@ai-sdk/xai` 的 `xai.image('grok-imagine-image-2.0')` + `generateImage`。语言模型已有 `xai` preset 走 OpenAI `/v1` 兼容端点；挂在兼容端点时生图走 `createOpenAI().image()`，对准 `images/generations`。不要用 `streamText` 调 imagine 模型。
- xAI 视频必须 `createXai().video('grok-imagine-video')` + `experimental_generateVideo`。不要用 `image()` 冒充。档案即使 kind=openai，只要模型 id 是 imagine-video 也走这条。Base URL 跟生图同一主机；只有空或 `api.openai.com` 才改打 `https://api.x.ai/v1`。国内中转能出图却强行打官方 x.ai 会 Connect Timeout。
- 估算成本不要按模型家族前缀猜价，也不要把供应商没返回的缓存/推理 token 写成 0。没命中快照且用户没填 → `unknown`。有缓存 token 但缺缓存单价 → 整次 `unknown`。推理默认含在 output 里；只有快照写了独立推理单价才拆开。`inputTokens` 已含缓存，输入价只乘 `noCacheTokens`（没有则 `input − cacheRead − cacheWrite`）。models.dev 的 `family` 不是别名，禁止写进快照。
- **隐患**：把 `alibaba` / `alibaba-cn` 都映射成 `qwen` 再按 kind `seen` 去重，国际价会盖住国内价。按 region 猜 catalog 也不稳。正确做法：有国内/国际或套餐歧义的映射先撤，显示 unknown；用户自填单价仍估算。带区域的定价以后另开一刀。`officialSiblingEndpoints` 仍不能当估价官方门（会把套餐主机算进去）。
- models.dev `cost.tiers` 是按上下文长度分档。SDK `finish` 的 inputTokens 是各步总和，拿它判断会把「10 步 × 30K」误判超档。正确做法：从 `finish-step` 记 `maxStepInputTokens`，超过 `tierContext`、拿不到单步值、或 `stepInputIncomplete`（部分步骤没报 input）才 `unknown`（`missing: ["tier"]`）。合计仍按 totalUsage 计价。
- **隐患**：`cohere` 没有聊天 preset 时 `presetFor` 会落到 custom，空 baseURL 会被当成官方端点。正确做法：`kindAllowsSnapshot` 显式排除 `cohere` 与其它媒体-only kind。
- models.dev `siliconflow` 是国际站 `.com`，本仓 preset 是国内站 `.cn`，共有模型里有不同价。正确做法：收录 `siliconflow-cn`。目录带 `api` 时必须和 preset 同站，对不上就撤。
- Node `--experimental-strip-types` 加载 `@enjoy-agents/providers` 入口时，无后缀 `./capabilities/probe` 会 `ERR_MODULE_NOT_FOUND`（文件是 `probe.ts`）；`from "./presets"` 在 Unix 会撞上 `presets/` 目录。正确做法：相对导入带 `.ts`。`capabilities/probe.ts` 只是内存缓存桩，不发网络请求。
