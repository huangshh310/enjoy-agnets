# spec/providers

> 协议工厂，不是品牌锁定。最后更新：2026-08-31

## 当前真相

运行时是 Vercel AI SDK 7：`createOpenAI` / `createAnthropic` / `openai.responses`。品牌卡片是 **preset**，填 `kind`、`apiStyle`、`defaultBaseURL`、默认模型目录。

| `apiStyle` | 线协议 | 典型路径 |
|---|---|---|
| `openai` | Chat Completions | `/v1/chat/completions` |
| `anthropic` | Messages | `/v1/messages` |
| `openai-responses` | Responses | `/v1/responses` |

密钥只存在主进程 vault（`safeStorage`）。`ProviderPublic` 给 UI：`hasKey`、`keyHint`（`••••` + 后四位）、Base URL，**从不回说明文 Key**。

探测：`probeProvider` / `pingProvider` / `discoverRemoteModels`。Fetch `/models` 合并进用户目录；HTML 当 JSON 要报成可读端点错误，不要把 parse dump 丢给用户。

推理强度：`ReasoningEffort` + composer 上的 Energy Bar。主进程按模型 ID 决定是否走 DeepSeek reasoning API（`usesDeepSeekReasoningApi`）。

设置页交互（Configured / Explore Presets、Dialog 四页签）以 [../references/visual-system.md](../references/visual-system.md) §14 为准；本 spec 只锁协议与密钥边界。

## 不变量

- renderer 永不 `readSecret` 明文。编辑对话框提交 Key 只走 `settings.upsertProvider` / `settings.saveSecret`。
- Custom Endpoint（OpenAI `/v1`、Anthropic Messages）必须在 Explore 顶部，不能埋在页底。
- 新增供应商：先加 `packages/providers` preset，再接线；不要在 UI 里手写一套 `createOpenAI`。
- 未知协议 / `kind === "custom"` 的图标用 `RiServerLine` / `RiPlugLine`，不用假品牌标。

## 代码入口

- 工厂与探测：`packages/providers`
- vault：`apps/desktop/src/main/services/secrets.ts`
- 设置 UI：`apps/desktop/src/renderer/src/components/settings/providers/`
- 合约：`packages/ipc-contract` 的 `UpsertProviderInput` / `ProviderPublic`

## 已知坑

- DeepSeek 走 OpenAI 兼容端点（`https://api.deepseek.com/v1`），不是独立 SDK。
- 国内中转只改 `baseURL` + 透传模型 ID。preset 不是唯一合法供应商。
- Ollama 等 `requiresKey === false` 的探测可塞占位 key，避免 SDK 因空 key 直接拒绝。
