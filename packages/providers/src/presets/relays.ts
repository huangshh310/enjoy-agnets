/**
 * 中转预设。没有 Anthropic / Responses 根的保持单条 Chat。
 */
import { definePreset, presetModel, type ProviderPreset } from "./define.ts"

export const RELAY_PRESETS: ProviderPreset[] = [
  definePreset({
    kind: "openrouter",
    name: "OpenRouter",
    description: "One key for many upstream models. Chat, Messages, and Responses share /api/v1.",
    group: "relay",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://openrouter.ai/docs",
    keysURL: "https://openrouter.ai/keys",
    headerHints: ["HTTP-Referer", "X-OpenRouter-Title"],
    endpoints: {
      openai: "https://openrouter.ai/api/v1",
      anthropic: "https://openrouter.ai/api/v1",
      "openai-responses": "https://openrouter.ai/api/v1"
    },
    models: [
      presetModel("openai/gpt-4.1-mini", "GPT-4.1 Mini"),
      presetModel("anthropic/claude-sonnet-4.5", "Claude Sonnet 4.5"),
      presetModel("deepseek/deepseek-chat", "DeepSeek Chat")
    ]
  }),
  definePreset({
    kind: "siliconflow",
    name: "SiliconFlow (硅基流动)",
    description: "Open-source model inference. Chat only.",
    group: "relay",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.siliconflow.cn/",
    keysURL: "https://cloud.siliconflow.cn/account/ak",
    endpoints: { openai: "https://api.siliconflow.cn/v1" },
    models: [
      presetModel("deepseek-ai/DeepSeek-V3", "DeepSeek V3"),
      presetModel("Qwen/Qwen2.5-72B-Instruct", "Qwen2.5 72B")
    ]
  }),
  definePreset({
    kind: "together",
    name: "Together AI",
    description: "Hosted open models. Chat only.",
    group: "relay",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.together.ai/",
    keysURL: "https://api.together.ai/settings/api-keys",
    endpoints: { openai: "https://api.together.xyz/v1" },
    models: [
      presetModel("meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B Turbo"),
      presetModel("Qwen/Qwen2.5-72B-Instruct-Turbo", "Qwen 2.5 72B Turbo"),
      presetModel("deepseek-ai/DeepSeek-R1", "DeepSeek R1 (Together)")
    ]
  }),
  definePreset({
    kind: "modelscope",
    name: "ModelScope",
    description: "魔搭 API-Inference. Chat and Responses share one root.",
    group: "relay",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://modelscope.cn/docs/model-service/API-Inference/intro",
    keysURL: "https://modelscope.cn/my/myaccesstoken",
    endpoints: {
      openai: "https://api-inference.modelscope.cn/v1",
      "openai-responses": "https://api-inference.modelscope.cn/v1"
    },
    models: []
  }),
  definePreset({
    kind: "aihubmix",
    name: "AiHubMix",
    description: "AiHubMix Chat and Anthropic roots.",
    group: "relay",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://aihubmix.com",
    keysURL: "https://console.aihubmix.com/token",
    endpoints: {
      openai: "https://aihubmix.com/v1",
      anthropic: "https://aihubmix.com"
    },
    models: []
  })
]
