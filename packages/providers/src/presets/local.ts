/**
 * 本机推理服务与自定义端点。自定义三条都空，主 API 默认 Chat。
 */
import { definePreset, presetModel, type ProviderPreset } from "./define.ts"

export const LOCAL_PRESETS: ProviderPreset[] = [
  definePreset({
    kind: "ollama",
    name: "Ollama",
    description: "Local models. Key is optional.",
    group: "local",
    apiStyle: "openai",
    requiresKey: false,
    docsURL: "https://ollama.com/",
    endpoints: { openai: "http://127.0.0.1:11434/v1" },
    models: [presetModel("llama3.1", "Llama 3.1"), presetModel("qwen2.5-coder", "Qwen 2.5 Coder")]
  }),
  definePreset({
    kind: "lmstudio",
    name: "LM Studio",
    description: "Local LM Studio server. Key is optional.",
    group: "local",
    apiStyle: "openai",
    requiresKey: false,
    docsURL: "https://lmstudio.ai/docs",
    endpoints: { openai: "http://127.0.0.1:1234/v1" },
    models: []
  }),
  definePreset({
    kind: "custom",
    name: "Custom endpoint",
    description: "Any third-party host. Pick the protocol it actually speaks.",
    group: "local",
    apiStyle: "openai",
    requiresKey: true,
    endpoints: {},
    supportedApiStyles: ["openai", "anthropic", "openai-responses"],
    models: []
  })
]
